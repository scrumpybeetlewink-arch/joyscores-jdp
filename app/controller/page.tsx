// @ts-nocheck
"use client";

export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

/** ---------- Shared ---------- */
const PATH = "/courts/court1";
type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  tiebreak: boolean;
  tb: Record<Side, number>;
  server: Side | null;
  ts?: number;
};

const COUNTRIES: Array<[string,string]> = [
  ["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇹🇭","Thailand"],["🇮🇩","Indonesia"],["🇵🇭","Philippines"],
  ["🇻🇳","Vietnam"],["🇮🇳","India"],["🇯🇵","Japan"],["🇰🇷","South Korea"],["🇨🇳","China"],
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇫🇷","France"],["🇩🇪","Germany"],
  ["🇪🇸","Spain"],["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],["🏳️","(None)"]
];

const flag = (cc: string) => cc || "🏳️";
const nextPoint = (p: Point): Point => (p===0?15:p===15?30:p===30?40:p===40?"Ad":"Ad");
const prevPoint = (p: Point): Point => (p===15?0:p===30?15:p===40?30:40);
const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

const defaultState: ScoreState = {
  meta: { name: "Centre Court", bestOf: 3 },
  players: { "1a":{name:"",cc:"🇲🇾"}, "1b":{name:"",cc:"🇲🇾"}, "2a":{name:"",cc:"🇲🇾"}, "2b":{name:"",cc:"🇲🇾"} },
  points: { p1:0, p2:0 },
  games: { p1:0, p2:0 },
  sets: { p1:[], p2:[] },
  tiebreak: false,
  tb: { p1:0, p2:0 },
  server: "p1",
  ts: undefined,
};

function normalize(v: any): ScoreState {
  return {
    ...defaultState,
    ...v,
    meta: {
      name: v?.meta?.name ?? "Centre Court",
      bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
    },
  };
}

/** ========================================================= */
export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, PATH), (snap) => setS(normalize(snap.val())));
    })();
    return () => unsub?.();
  }, []);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, PATH), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1;
    n.points = { p1: 0, p2: 0 };
    const gA = n.games.p1, gB = n.games.p2, lead = Math.abs(gA - gB);
    if ((gA >= 6 || gB >= 6) && lead >= 2) {
      n.sets.p1.push(gA); n.sets.p2.push(gB);
      n.games = { p1: 0, p2: 0 }; n.tiebreak = false; n.tb = { p1: 0, p2: 0 };
    } else if (gA === 6 && gB === 6) { n.tiebreak = true; n.tb = { p1: 0, p2: 0 }; }
  }

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();
    if (n.tiebreak) {
      n.tb[side] = Math.max(0, n.tb[side] + dir);
      const a = n.tb.p1, b = n.tb.p2;
      if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) {
        if (a > b) { n.sets.p1.push(n.games.p1 + 1); n.sets.p2.push(n.games.p2); }
        else { n.sets.p2.push(n.games.p2 + 1); n.sets.p1.push(n.games.p1); }
        n.games = { p1: 0, p2: 0 }; n.points = { p1: 0, p2: 0 }; n.tiebreak = false; n.tb = { p1: 0, p2: 0 };
      }
      return commit(n);
    }
    if (dir === 1) {
      const opp: Side = side === "p1" ? "p2" : "p1";
      const ps = n.points[side], po = n.points[opp];
      if (ps === 40 && [0,15,30].includes(po as number)) winGame(n, side);
      else if (ps === 40 && po === "Ad") n.points[opp] = 40;
      else if (ps === 40 && po === 40) n.points[side] = "Ad";
      else if (ps === "Ad") winGame(n, side);
      else n.points[side] = nextPoint(ps);
    } else n.points[side] = prevPoint(n.points[side]);
    commit(n);
  }

  function toggleServer() { const n = clone(); n.server = n.server==="p1"?"p2":"p1"; commit(n); }
  function resetGame() { const n = clone(); if (n.games.p1>n.games.p2) n.games.p1--; else if (n.games.p2>n.games.p1) n.games.p2--; commit(n); }

  function newMatch() {
    commit({
      ...defaultState,
      meta: { name: s.meta?.name || "Centre Court", bestOf: s.meta?.bestOf ?? 3 },
      players: { ...defaultState.players },
      server: "p1",
      ts: Date.now(),
    });
  }

  async function updatePlayer(key:"1a"|"1b"|"2a"|"2b", field:"name"|"cc", val:string) {
    const n = clone(); (n.players[key] as any)[field] = val; await commit(n);
  }
  async function updateBestOf(v: BestOf) { const n = clone(); n.meta.bestOf = v; await commit(n); }

  const maxSets = useMemo(() => (s.meta?.bestOf===5?5:3), [s.meta?.bestOf]);

  function renderRow(side: Side) {
    const players = s.players, sets = s.sets, games = s.games;
    const p1a = nameOrLabel(players["1a"].name, "Player 1");
    const p1b = nameOrLabel(players["1b"].name, "Player 2");
    const p2a = nameOrLabel(players["2a"].name, "Player 3");
    const p2b = nameOrLabel(players["2b"].name, "Player 4");
    const teamLine = side==="p1" ? `${flag(players["1a"].cc)} ${p1a} / ${flag(players["1b"].cc)} ${p1b}` : `${flag(players["2a"].cc)} ${p2a} / ${flag(players["2b"].cc)} ${p2b}`;
    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({length:maxSets}).map((_,i)=> i<finished ? (side==="p1"?sets.p1[i]??"":sets.p2[i]??"") : i===finished ? (side==="p1"?games.p1:games.p2) : "");
    const pointsLabel = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];
    const box = {fontSize:"1em",background:"var(--c-muted)",color:"#0b1419",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"2.1em",fontWeight:700} as const;
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 3.2em minmax(0,1fr)",gap:".75em",alignItems:"center",fontSize:"1.5em"}}>
        <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{teamLine}</div>
        <div style={{textAlign:"center"}}>{s.server===side?"🎾":""}</div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${maxSets+1},1fr)`,gap:".4em"}}>
          {setCells.map((v,i)=><div key={i} style={box}>{v}</div>)}
          <div style={box}>{String(pointsLabel)}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--c-ink)", minHeight: "100vh" }}>
      <style>{`
        :root{ --c-ink:#212A31; --c-ink-2:#0B1B2B; --c-primary:#124E66; --c-muted:#748D92; --c-cloud:#D3D9D4; }
        .container { margin: 0 auto; }
        .card{ background: var(--c-ink-2); color:#fff; border:1px solid rgba(0,0,0,.15); border-radius:16px; padding:1rem; box-shadow:0 6px 20px rgba(0,0,0,.25); }
        .input{ width:100%; background: var(--c-cloud); border:1px solid var(--c-muted); color:#0b1419; border-radius:10px; height:2.6em; padding:0 .9em; font-size:1em; }
        .btn{ border:1px solid transparent; background: var(--c-primary); color:#fff; border-radius:12px; height:2.8em; padding:0 1.1em; font-weight:700; font-size:1em; }
        .btn-danger{ background:#8b2e2e; } .btn-gold{ background: var(--c-muted); color:#0b1419; }
      `}</style>

      <div className="container" style={{ width:"min(1200px,95vw)", paddingTop:18, paddingBottom:24 }}>
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:12}}>
            <div style={{color:"var(--c-cloud)",fontSize:"1.4em",fontWeight:700}}>{s.meta?.name || "Centre Court"}</div>
            <select className="input" style={{width:"12em",borderRadius:9999}} value={s.meta?.bestOf ?? 3} onChange={(e)=>updateBestOf(Number(e.target.value) as BestOf)}>
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>

          {renderRow("p1")}
          {renderRow("p2")}
          <div style={{height:1,background:"rgba(211,217,212,.18)",margin:"1rem 0"}} />

          {/* Team panels (unchanged layout, condensed here) */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"1rem"}}>
            {/* Team A */}
            <div className="card" style={{background:"rgba(33,42,49,.45)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
                {["1a","1b"].map((k,idx)=>(
                  <div key={k}>
                    <label style={{color:"var(--c-cloud)"}}>Player {idx+1}</label>
                    <input className="input" placeholder="Enter Name" value={s.players[k].name} onChange={(e)=>updatePlayer(k as any,"name",e.target.value)} />
                    <select className="input" value={s.players[k].cc} onChange={(e)=>updatePlayer(k as any,"cc",e.target.value)}>
                      {COUNTRIES.map(([f,n])=><option key={f+n} value={f}>{f} {n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginTop:".75rem"}}>
                <button className="btn" style={{fontSize:"2.3em"}} onClick={()=>addPoint("p1",+1)}>+</button>
                <button className="btn" style={{fontSize:"2.3em"}} onClick={()=>addPoint("p1",-1)}>−</button>
              </div>
            </div>

            {/* Team B */}
            <div className="card" style={{background:"rgba(33,42,49,.45)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
                {["2a","2b"].map((k,idx)=>(
                  <div key={k}>
                    <label style={{color:"var(--c-cloud)"}}>Player {idx+3}</label>
                    <input className="input" placeholder="Enter Name" value={s.players[k].name} onChange={(e)=>updatePlayer(k as any,"name",e.target.value)} />
                    <select className="input" value={s.players[k].cc} onChange={(e)=>updatePlayer(k as any,"cc",e.target.value)}>
                      {COUNTRIES.map(([f,n])=><option key={f+n} value={f}>{f} {n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginTop:".75rem"}}>
                <button className="btn" style={{fontSize:"2.3em"}} onClick={()=>addPoint("p2",+1)}>+</button>
                <button className="btn" style={{fontSize:"2.3em"}} onClick={()=>addPoint("p2",-1)}>−</button>
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
            <button className="btn btn-danger" onClick={resetGame}>Reset Game</button>
            <button className="btn btn-gold" onClick={newMatch}>New Match</button>
            <button className="btn" onClick={toggleServer}>Serve🎾</button>
          </div>
        </div>
      </div>
    </div>
  );
}

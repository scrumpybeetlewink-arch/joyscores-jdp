"use client";

import { useEffect, useState, useMemo } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

/** ---------- Types ---------- */
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

/** ---------- Firebase Paths ---------- */
const COURT_PATH = "/courts/court1";
const META_NAME_PATH = "/courts/court1/meta/name";

/** ---------- Helpers ---------- */
const COUNTRIES: Array<[string, string]> = [
  ["🇲🇾", "Malaysia"], ["🇸🇬", "Singapore"], ["🇹🇭", "Thailand"],
  ["🇮🇩", "Indonesia"], ["🇵🇭", "Philippines"], ["🇻🇳", "Vietnam"],
  ["🇯🇵", "Japan"], ["🇰🇷", "South Korea"], ["🇨🇳", "China"],
  ["🇺🇸", "United States"], ["🇬🇧", "United Kingdom"], ["🇫🇷", "France"],
  ["🇩🇪", "Germany"], ["🇪🇸", "Spain"], ["🇮🇹", "Italy"]
];

const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fb: string) => (n?.trim() ? n : fb);

const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";

const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: {
    "1a": { name: "", cc: "🇲🇾" }, "1b": { name: "", cc: "🇲🇾" },
    "2a": { name: "", cc: "🇲🇾" }, "2b": { name: "", cc: "🇲🇾" }
  },
  points: { p1: 0, p2: 0 }, games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] }, tiebreak: false,
  tb: { p1: 0, p2: 0 }, server: "p1"
};

function normalize(v: any): ScoreState {
  if (!v) return defaultState;
  return {
    ...defaultState,
    ...v,
    meta: {
      name: v?.meta?.name ?? "",
      bestOf: v?.meta?.bestOf === 5 ? 5 : 3
    }
  };
}

/** =========================================================
 *  Controller Page
 *  ========================================================= */
export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [courtName, setCourtName] = useState<string>("");

  useEffect(() => {
    let unsub1 = () => {};
    let unsub2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub1 = onValue(ref(db, COURT_PATH), (snap) => {
        setS(normalize(snap.val()));
      });
      unsub2 = onValue(ref(db, META_NAME_PATH), (snap) => {
        const v = snap.val();
        setCourtName(typeof v === "string" ? v : "");
      });
    })();
    return () => { unsub1(); unsub2(); };
  }, []);

  const commit = async (next: ScoreState) => {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  };
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1;
    n.points = { p1: 0, p2: 0 };
    const gA = n.games.p1, gB = n.games.p2, lead = Math.abs(gA - gB);
    if ((gA >= 6 || gB >= 6) && lead >= 2) {
      n.sets.p1.push(gA); n.sets.p2.push(gB);
      n.games = { p1: 0, p2: 0 }; n.tiebreak = false; n.tb = { p1: 0, p2: 0 };
    } else if (gA === 6 && gB === 6) {
      n.tiebreak = true; n.tb = { p1: 0, p2: 0 };
    }
  }

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();
    if (n.tiebreak) {
      n.tb[side] = Math.max(0, n.tb[side] + dir);
      return commit(n);
    }
    if (dir === 1) {
      const opp: Side = side === "p1" ? "p2" : "p1";
      const ps = n.points[side], po = n.points[opp];
      if (ps === 40 && (po === 0 || po === 15 || po === 30)) winGame(n, side);
      else if (ps === 40 && po === "Ad") n.points[opp] = 40;
      else if (ps === 40 && po === 40) n.points[side] = "Ad";
      else if (ps === "Ad") winGame(n, side);
      else n.points[side] = nextPoint(ps);
    } else n.points[side] = prevPoint(n.points[side]);
    commit(n);
  }

  function toggleServer() { const n = clone(); n.server = n.server === "p1" ? "p2" : "p1"; commit(n); }
  function resetGame() { const n = clone(); n.games = { p1: 0, p2: 0 }; commit(n); }
  function newMatch() { commit({ ...defaultState, meta: { ...defaultState.meta, name: courtName } }); }

  async function updatePlayer(k: "1a"|"1b"|"2a"|"2b", f: "name"|"cc", v: string) {
    const n = clone(); (n.players[k] as any)[f] = v; await commit(n);
  }
  async function updateBestOf(v: BestOf) { const n = clone(); n.meta.bestOf = v; await commit(n); }

  const maxSets = useMemo(() => (s.meta.bestOf === 5 ? 5 : 3), [s.meta.bestOf]);

  const renderRow = (side: Side) => {
    const sets = s.sets, games = s.games, players = s.players;
    const team = side === "p1"
      ? `${flag(players["1a"].cc)} ${nameOrLabel(players["1a"].name,"Player 1")} / ${flag(players["1b"].cc)} ${nameOrLabel(players["1b"].name,"Player 2")}`
      : `${flag(players["2a"].cc)} ${nameOrLabel(players["2a"].name,"Player 3")} / ${flag(players["2b"].cc)} ${nameOrLabel(players["2b"].name,"Player 4")}`;
    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({length:maxSets}).map((_,i)=> {
      if (i < finished) return side==="p1"?sets.p1[i]??"":sets.p2[i]??"";
      if (i === finished) return side==="p1"?games.p1:games.p2;
      return "";
    });
    const points = s.tiebreak?`TB ${s.tb[side]}`:s.points[side];
    return (
      <div className="row" style={{display:"grid",gridTemplateColumns:"1fr 3rem minmax(0,1fr)",gap:"1rem",alignItems:"center",fontSize:"1.3em"}}>
        <div className="teamline" style={{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{team}</div>
        <div className="serve" style={{textAlign:"center"}}>{s.server===side?"🎾":""}</div>
        <div className="grid" style={{display:"grid",gridTemplateColumns:`repeat(${maxSets+1},1fr)`,gap:".6rem"}}>
          {setCells.map((v,i)=><div key={i} className="box" style={{background:"#748D92",color:"#0b1419",borderRadius:12,minHeight:"2.4em",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{v}</div>)}
          <div className="box" style={{background:"#748D92",color:"#0b1419",borderRadius:12,minHeight:"2.4em",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{String(points)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="wrap" style={{background:"#212A31",minHeight:"100vh",padding:"18px 2vw"}}>
      <div className="container" style={{margin:"0 auto",width:"min(1100px,92vw)"}}>
        <div className="card" style={{background:"#0B1B2B",color:"#fff",borderRadius:16,padding:"1.25rem",boxShadow:"0 6px 20px rgba(0,0,0,.25)"}}>
          <div className="head" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
            <div className="title" style={{fontSize:"1.4em",fontWeight:800}}>{courtName}</div>
            <select value={s.meta.bestOf} onChange={(e)=>updateBestOf(Number(e.target.value) as BestOf)} style={{borderRadius:9999,padding:"0 .9em",height:"2.6em"}}>
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>
          {renderRow("p1")}
          {renderRow("p2")}
          <div style={{margin:"1rem 0",height:1,background:"rgba(211,217,212,.18)"}}/>
          {/* TEAM PANELS */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            {(["1a","1b"] as const).map((k,idx)=>(
              <div key={k} style={{display:"flex",flexDirection:"column",gap:".4rem",background:"rgba(33,42,49,.45)",padding:"1rem",borderRadius:12}}>
                <label>{`Player ${idx+1}`}</label>
                <input className="input" value={s.players[k].name} onChange={(e)=>updatePlayer(k,"name",e.target.value)} placeholder="Enter name"/>
                <select className="input" value={s.players[k].cc} onChange={(e)=>updatePlayer(k,"cc",e.target.value)}>
                  {COUNTRIES.map(([f,n])=><option key={f} value={f}>{f} {n}</option>)}
                </select>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                  <button onClick={()=>addPoint("p1",+1)}>+</button>
                  <button onClick={()=>addPoint("p1",-1)}>−</button>
                </div>
              </div>
            ))}
            {(["2a","2b"] as const).map((k,idx)=>(
              <div key={k} style={{display:"flex",flexDirection:"column",gap:".4rem",background:"rgba(33,42,49,.45)",padding:"1rem",borderRadius:12}}>
                <label>{`Player ${idx+3}`}</label>
                <input className="input" value={s.players[k].name} onChange={(e)=>updatePlayer(k,"name",e.target.value)} placeholder="Enter name"/>
                <select className="input" value={s.players[k].cc} onChange={(e)=>updatePlayer(k,"cc",e.target.value)}>
                  {COUNTRIES.map(([f,n])=><option key={f} value={f}>{f} {n}</option>)}
                </select>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                  <button onClick={()=>addPoint("p2",+1)}>+</button>
                  <button onClick={()=>addPoint("p2",-1)}>−</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:".75rem",justifyContent:"center",marginTop:"1rem"}}>
            <button onClick={resetGame}>Reset Game</button>
            <button onClick={newMatch}>New Match</button>
            <button onClick={toggleServer}>Serve 🎾</button>
          </div>
        </div>
      </div>
    </div>
  );
}

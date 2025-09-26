// @ts-nocheck
"use client";
export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

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
const nameOr = (n: string, f: string) => (n?.trim()?n:f);

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

function normalize(v:any): ScoreState {
  return {
    ...defaultState,
    ...v,
    meta: { name: v?.meta?.name ?? "Centre Court", bestOf: (v?.meta?.bestOf===5?5:3) as BestOf }
  };
}

export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, PATH), (snap)=> setS(normalize(snap.val())));
    })();
    return () => unsub?.();
  }, []);

  async function commit(next: ScoreState) { next.ts = Date.now(); await set(ref(db, PATH), next); }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1; n.points = { p1:0, p2:0 };
    const a=n.games.p1,b=n.games.p2;
    if ((a>=6||b>=6) && Math.abs(a-b)>=2){ n.sets.p1.push(a); n.sets.p2.push(b); n.games={p1:0,p2:0}; n.tiebreak=false; n.tb={p1:0,p2:0}; }
    else if (a===6 && b===6){ n.tiebreak=true; n.tb={p1:0,p2:0}; }
  }
  function addPoint(side: Side, dir:1|-1){
    const n=clone();
    if (n.tiebreak){
      n.tb[side]=Math.max(0,n.tb[side]+dir);
      const a=n.tb.p1,b=n.tb.p2;
      if ((a>=7||b>=7)&&Math.abs(a-b)>=2){
        if (a>b){ n.sets.p1.push(n.games.p1+1); n.sets.p2.push(n.games.p2); }
        else { n.sets.p2.push(n.games.p2+1); n.sets.p1.push(n.games.p1); }
        n.games={p1:0,p2:0}; n.points={p1:0,p2:0}; n.tiebreak=false; n.tb={p1:0,p2:0};
      }
      return commit(n);
    }
    if (dir===1){
      const opp=side==="p1"?"p2":"p1", ps=n.points[side], po=n.points[opp];
      if (ps===40 && [0,15,30].includes(po as number)) winGame(n,side);
      else if (ps===40 && po==="Ad") n.points[opp]=40;
      else if (ps===40 && po===40) n.points[side]="Ad";
      else if (ps==="Ad") winGame(n,side);
      else n.points[side]=nextPoint(ps);
    } else n.points[side]=prevPoint(n.points[side]);
    commit(n);
  }
  function toggleServer(){ const n=clone(); n.server=n.server==="p1"?"p2":"p1"; commit(n); }
  function resetGame(){ const n=clone(); if (n.games.p1>n.games.p2) n.games.p1--; else if (n.games.p2>n.games.p1) n.games.p2--; commit(n); }
  function newMatch(){
    commit({ ...defaultState, meta:{ name:s.meta?.name||"Centre Court", bestOf:s.meta?.bestOf??3 }, players:{...defaultState.players}, server:"p1", ts:Date.now() });
  }

  async function updatePlayer(k:"1a"|"1b"|"2a"|"2b", field:"name"|"cc", val:string){ const n=clone(); (n.players[k] as any)[field]=val; await commit(n); }
  async function updateBestOf(v:BestOf){ const n=clone(); n.meta.bestOf=v; await commit(n); }

  const maxSets = useMemo(()=> (s.meta?.bestOf===5?5:3), [s.meta?.bestOf]);

  function Row({side}:{side:Side}){
    const p=s.players, sets=s.sets, games=s.games;
    const p1a=nameOr(p["1a"].name,"Player 1"), p1b=nameOr(p["1b"].name,"Player 2");
    const p2a=nameOr(p["2a"].name,"Player 3"), p2b=nameOr(p["2b"].name,"Player 4");
    const team = side==="p1" ? `${flag(p["1a"].cc)} ${p1a} / ${flag(p["1b"].cc)} ${p1b}` : `${flag(p["2a"].cc)} ${p2a} / ${flag(p["2b"].cc)} ${p2b}`;
    const finished = Math.max(sets.p1.length, sets.p2.length);
    const cells = Array.from({length:maxSets}).map((_,i)=> i<finished ? (side==="p1"?sets.p1[i]??"":sets.p2[i]??"") : i===finished ? (side==="p1"?games.p1:games.p2) : "");
    const pts = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];
    return (
      <div className="row">
        <div className="teamline">{team}</div>
        <div className="serve">{s.server===side?"🎾":""}</div>
        <div className="grid">{cells.map((v,i)=><div key={i} className="box">{v}</div>)}<div className="box">{String(pts)}</div></div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --primary:#124E66; --muted:#748D92; --cloud:#D3D9D4; }
        .wrap{ background:var(--ink); min-height:100vh; padding:18px 2vw; }
        .container{ margin:0 auto; width:min(1100px,92vw); }
        .card{ background:var(--ink2); color:#fff; border:1px solid rgba(0,0,0,.15); border-radius:16px; padding:1.25rem; box-shadow:0 6px 20px rgba(0,0,0,.25); }
        .head{ display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:10px; }
        .title{ color:var(--cloud); font-size:1.4em; font-weight:800; }
        .select{ width:12em; border-radius:9999px; height:2.6em; background:var(--cloud); color:#0b1419; border:1px solid var(--muted); padding:0 .9em; }

        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.35em; margin:10px 0; }
        .teamline{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        /* ✅ FIX: compute columns in JS, not 3+1 literal */
        .grid{ display:grid; grid-template-columns: repeat(${(/* TS hint */ 0 as any) || ''}${maxSets + 1}, 1fr); gap:.6rem; }
        .box{ background:var(--muted); color:#0b1419; border-radius:12px; min-height:2.6em; display:flex; align-items:center; justify-content:center; font-weight:800; }

        .panelGrid{ display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:1rem; }
        .panel{ background:rgba(33,42,49,.45); border:1px solid rgba(211,217,212,.12); border-radius:12px; padding:1rem; }
        .input{ width:100%; background:#D3D9D4; color:#0b1419; border:1px solid var(--muted); border-radius:10px; height:2.6em; padding:0 .9em; }

        .btn{ border:1px solid transparent; background:var(--primary); color:#fff; border-radius:12px; height:2.8em; padding:0 1.1em; font-weight:700; font-size:1em; }
        .pm{ font-size:2.2em; line-height:1; }
        .danger{ background:#8b2e2e; } .gold{ background:var(--muted); color:#0b1419; }
        .hr{ height:1px; background:rgba(211,217,212,.18); margin:12px 0; }
      `}</style>

      <div className="container">
        <div className="card">
          <div className="head">
            <div className="title">{s.meta?.name || "Centre Court"}</div>
            <select className="select" value={s.meta?.bestOf ?? 3} onChange={(e)=>updateBestOf(Number(e.target.value) as BestOf)}>
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>

          <Row side="p1" />
          <Row side="p2" />

          <div className="hr" />

          <div className="panelGrid">
            <div className="panel">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
                {["1a","1b"].map((k,i)=>(
                  <div key={k}>
                    <label style={{color:"var(--cloud)"}}>Player {i+1}</label>
                    <input className="input" placeholder="Enter Name" value={s.players[k].name} onChange={(e)=>updatePlayer(k as any,"name",e.target.value)} />
                    <select className="input" value={s.players[k].cc} onChange={(e)=>updatePlayer(k as any,"cc",e.target.value)}>
                      {COUNTRIES.map(([f,n])=><option key={f+n} value={f}>{f} {n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginTop:".75rem"}}>
                <button className="btn pm" onClick={()=>addPoint("p1",+1)}>+</button>
                <button className="btn pm" onClick={()=>addPoint("p1",-1)}>−</button>
              </div>
            </div>

            <div className="panel">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
                {["2a","2b"].map((k,i)=>(
                  <div key={k}>
                    <label style={{color:"var(--cloud)"}}>Player {i+3}</label>
                    <input className="input" placeholder="Enter Name" value={s.players[k].name} onChange={(e)=>updatePlayer(k as any,"name",e.target.value)} />
                    <select className="input" value={s.players[k].cc} onChange={(e)=>updatePlayer(k as any,"cc",e.target.value)}>
                      {COUNTRIES.map(([f,n])=><option key={f+n} value={f}>{f} {n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginTop:".75rem"}}>
                <button className="btn pm" onClick={()=>addPoint("p2",+1)}>+</button>
                <button className="btn pm" onClick={()=>addPoint("p2",-1)}>−</button>
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
            <button className="btn danger" onClick={resetGame}>Reset Game</button>
            <button className="btn gold" onClick={newMatch}>New Match</button>
            <button className="btn" onClick={toggleServer}>Serve🎾</button>
          </div>
        </div>
      </div>
    </div>
  );
}

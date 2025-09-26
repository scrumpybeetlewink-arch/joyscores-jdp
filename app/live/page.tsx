// @ts-nocheck
"use client";
export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

const PATH = "/courts/court1";

type Side = "p1" | "p2";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, 0|15|30|40|"Ad">;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  tiebreak: boolean;
  tb: Record<Side, number>;
  server: Side | null;
  ts?: number;
};

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
  return { ...defaultState, ...v, meta:{ name:v?.meta?.name ?? "Centre Court", bestOf:(v?.meta?.bestOf===5?5:3) as BestOf }};
}

export default function LivePage() {
  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, PATH), (snap)=> setS(normalize(snap.val())));
    })();
    return () => unsub?.();
  }, []);

  const maxSets = useMemo(()=> (s.meta?.bestOf===5?5:3), [s.meta?.bestOf]);

  function Row({side}:{side:Side}){
    const p=s.players, sets=s.sets, games=s.games;
    const line = side==="p1"
      ? `${p["1a"].cc} ${p["1a"].name||"Player 1"} / ${p["1b"].cc} ${p["1b"].name||"Player 2"}`
      : `${p["2a"].cc} ${p["2a"].name||"Player 3"} / ${p["2b"].cc} ${p["2b"].name||"Player 4"}`;

    const finished = Math.max(sets.p1.length, sets.p2.length);
    const cells = Array.from({length:maxSets}).map((_,i)=> i<finished ? (side==="p1"?sets.p1[i]??"":sets.p2[i]??"") : i===finished ? (side==="p1"?games.p1:games.p2) : "");
    const pts = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    const boxStyle: React.CSSProperties = { background:"#748D92", color:"#0b1419", borderRadius:12, minHeight:"2.4em", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 };

    return (
      <div className="row" style={{display:"grid",gridTemplateColumns:"1fr 3rem minmax(0,1fr)",gap:"1rem",alignItems:"center",fontSize:"1.28em"}}>
        <div className="teamline" style={{color:"#D3D9D4",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{line}</div>
        <div className="serve" style={{textAlign:"center"}}>{s.server===side?"🎾":""}</div>
        <div className="grid" style={{display:"grid",gap:".6rem",gridTemplateColumns:`repeat(${maxSets+1}, 1fr)`}}>
          {cells.map((v,i)=><div key={i} className="box" style={boxStyle}>{v}</div>)}
          <div className="box" style={boxStyle}>{String(pts)}</div>
        </div>
      </div>
    );
  }

  return (
    <main className="wrap" style={{minHeight:"100vh",background:"#212A31",display:"flex",alignItems:"center",justifyContent:"center",padding:"2vh 2vw"}}>
      <section className="card" style={{width:"min(1100px,95vw)",background:"#0B1B2B",color:"#fff",borderRadius:16,boxShadow:"0 6px 20px rgba(0,0,0,.25)",padding:"1rem 1.25rem"}}>
        <div className="header" style={{textAlign:"center",paddingBottom:".8rem",borderBottom:"1px solid rgba(211,217,212,.16)"}}>
          <div className="court" style={{fontSize:"1.5em",fontWeight:800,color:"#D3D9D4"}}>{s.meta?.name || "Centre Court"}</div>
        </div>
        <div className="rows" style={{display:"grid",gap:".9rem",marginTop:".9rem"}}>
          <Row side="p1" />
          <Row side="p2" />
        </div>
      </section>
    </main>
  );
}

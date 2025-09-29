"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

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

const COURT_PATH = "/courts/court1";
const META_NAME_PATH = "/courts/court1/meta/name";

const COUNTRIES: Array<[flag: string, name: string]> = [
  ["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇹🇭","Thailand"],["🇮🇩","Indonesia"],
  ["🇵🇭","Philippines"],["🇻🇳","Vietnam"],["🇮🇳","India"],["🇯🇵","Japan"],
  ["🇰🇷","South Korea"],["🇨🇳","China"],["🇺🇸","United States"],["🇨🇦","Canada"],
  ["🇬🇧","United Kingdom"],["🇫🇷","France"],["🇩🇪","Germany"],["🇪🇸","Spain"],
  ["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],["🏳️","(None)"]
];

const defaultState: ScoreState = {
  meta: { name: "Centre Court", bestOf: 3 },
  players: {
    "1a": { name: "", cc: "🇲🇾" },
    "1b": { name: "", cc: "🇲🇾" },
    "2a": { name: "", cc: "🇲🇾" },
    "2b": { name: "", cc: "🇲🇾" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  tiebreak: false,
  tb: { p1: 0, p2: 0 },
  server: "p1",
};

const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

function normalize(v: any): ScoreState {
  if (!v) return defaultState;
  return {
    meta: {
      name: v?.meta?.name ?? "Centre Court",
      bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
    },
    players: {
      "1a": { name: v?.players?.["1a"]?.name ?? "", cc: v?.players?.["1a"]?.cc ?? "🇲🇾" },
      "1b": { name: v?.players?.["1b"]?.name ?? "", cc: v?.players?.["1b"]?.cc ?? "🇲🇾" },
      "2a": { name: v?.players?.["2a"]?.name ?? "", cc: v?.players?.["2a"]?.cc ?? "🇲🇾" },
      "2b": { name: v?.players?.["2b"]?.name ?? "", cc: v?.players?.["2b"]?.cc ?? "🇲🇾" },
    },
    points: { p1: v?.points?.p1 ?? 0, p2: v?.points?.p2 ?? 0 },
    games: { p1: v?.games?.p1 ?? 0, p2: v?.games?.p2 ?? 0 },
    sets: { p1: v?.sets?.p1 ?? [], p2: v?.sets?.p2 ?? [] },
    tiebreak: !!v?.tiebreak,
    tb: { p1: v?.tb?.p1 ?? 0, p2: v?.tb?.p2 ?? 0 },
    server: v?.server === "p1" || v?.server === "p2" ? v.server : "p1",
    ts: v?.ts ?? undefined,
  };
}

export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [courtName, setCourtName] = useState<string>(defaultState.meta.name);

  useEffect(() => {
    let off1 = () => {};
    let off2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      off1 = onValue(ref(db, COURT_PATH), (snap) => setS(normalize(snap.val())));
      off2 = onValue(ref(db, META_NAME_PATH), (snap) => {
        const v = snap.val();
        if (typeof v === "string") setCourtName(v);
      });
    })();
    return () => { off1?.(); off2?.(); };
  }, []);

  const commit = async (next: ScoreState) => {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  };
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;
  const maxSets = useMemo(() => (s.meta.bestOf === 5 ? 5 : 3), [s.meta.bestOf]);

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();
    if (dir === 1) {
      const opp: Side = side === "p1" ? "p2" : "p1";
      if (n.points[side] === 40 && (n.points[opp] === 0 || n.points[opp] === 15 || n.points[opp] === 30)) {
        n.games[side] += 1; n.points = { p1: 0, p2: 0 };
      } else if (n.points[side] === 40 && n.points[opp] === "Ad") {
        n.points[opp] = 40;
      } else if (n.points[side] === 40 && n.points[opp] === 40) {
        n.points[side] = "Ad";
      } else if (n.points[side] === "Ad") {
        n.games[side] += 1; n.points = { p1: 0, p2: 0 };
      } else {
        n.points[side] = nextPoint(n.points[side]);
      }
    } else {
      n.points[side] = prevPoint(n.points[side]);
    }
    commit(n);
  }

  function toggleServer() {
    const n = clone();
    n.server = n.server === "p1" ? "p2" : "p1";
    commit(n);
  }

  function newMatch() {
    commit({ ...defaultState, meta: { name: courtName, bestOf: s.meta.bestOf }, ts: Date.now() });
  }

  function resetGame() {
    commit({ ...s, points: { p1: 0, p2: 0 }, tb: { p1: 0, p2: 0 }, tiebreak: false });
  }

  async function updatePlayer(key: "1a"|"1b"|"2a"|"2b", field: "name"|"cc", val: string) {
    const n = clone();
    (n.players[key] as any)[field] = val;
    await commit(n);
  }

  async function updateBestOf(v: BestOf) {
    const n = clone();
    n.meta.bestOf = v;
    await commit(n);
  }

  return (
    <main className="wrap">
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --primary:#124E66; --muted:#748D92; --cloud:#D3D9D4; }
        .wrap{ background:var(--ink); min-height:100vh; padding:20px; color:#fff; }
        .card{ background:var(--ink2); border-radius:16px; padding:1.2rem; box-shadow:0 6px 20px rgba(0,0,0,.25); max-width:1100px; margin:0 auto; }
        .head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .title{ font-size:1.4em; font-weight:800; color:var(--cloud); }
        .select{ background:var(--cloud); color:#0b1419; border-radius:9999px; padding:.3em .9em; }

        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.28em; margin:10px 0; }
        .teamline{ overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .serve{text-align:center;}
        .grid{ display:grid; gap:.6rem; }

        .panelGrid{ display:grid; grid-template-columns: repeat(2,1fr); gap:1rem; margin-top:1rem; }
        .panel{ background:rgba(33,42,49,.45); border-radius:12px; padding:1rem; }
        .input{ width:100%; margin-bottom:.5rem; background:#D3D9D4; border-radius:10px; padding:.5em; }

        .btn{ border:none; border-radius:12px; background:var(--primary); color:#fff; font-size:1.8rem; font-weight:800; height:3em; }
        .btnRow{ display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
        .footer{ display:flex; gap:.75rem; flex-wrap:wrap; justify-content:center; margin-top:1rem; }
        .btnSm{ padding:.6em 1.2em; border-radius:12px; }
        .danger{ background:#8b2e2e; }
        .gold{ background:var(--muted); color:#0b1419; }
      `}</style>

      <div className="card">
        <div className="head">
          <div className="title">{courtName}</div>
          <select className="select" value={s.meta.bestOf} onChange={(e)=>updateBestOf(Number(e.target.value) as BestOf)}>
            <option value={3}>Best of 3</option>
            <option value={5}>Best of 5</option>
          </select>
        </div>

        <div className="row">
          <div className="teamline">{s.players["1a"].cc} {s.players["1a"].name || "Player 1"} / {s.players["1b"].cc} {s.players["1b"].name || "Player 2"}</div>
          <div className="serve">{s.server==="p1"?"🎾":""}</div>
          <div className="grid" style={{gridTemplateColumns:`repeat(${maxSets+1},1fr)`}}>
            {s.sets.p1.map((v,i)=><div key={i}>{v}</div>)}
            <div>{s.points.p1}</div>
          </div>
        </div>

        <div className="row">
          <div className="teamline">{s.players["2a"].cc} {s.players["2a"].name || "Player 3"} / {s.players["2b"].cc} {s.players["2b"].name || "Player 4"}</div>
          <div className="serve">{s.server==="p2"?"🎾":""}</div>
          <div className="grid" style={{gridTemplateColumns:`repeat(${maxSets+1},1fr)`}}>
            {s.sets.p2.map((v,i)=><div key={i}>{v}</div>)}
            <div>{s.points.p2}</div>
          </div>
        </div>

        <div className="panelGrid">
          <div className="panel">
            <input className="input" placeholder="Player 1" value={s.players["1a"].name} onChange={(e)=>updatePlayer("1a","name",e.target.value)} />
            <select className="input" value={s.players["1a"].cc} onChange={(e)=>updatePlayer("1a","cc",e.target.value)}>
              {COUNTRIES.map(([f,n])=><option key={f+n} value={f}>{f} {n}</option>)}
            </select>
            <input className="input" placeholder="Player 2" value={s.players["1b"].name} onChange={(e)=>updatePlayer("1b","name",e.target.value)} />
            <select className="input" value={s.players["1b"].cc} onChange={(e)=>updatePlayer("1b","cc",e.target.value)}>
              {COUNTRIES.map(([f,n])=><option key={f+n} value={f}>{f} {n}</option>)}
            </select>
            <div className="btnRow">
              <button className="btn" onClick={()=>addPoint("p1",+1)}>+</button>
              <button className="btn" onClick={()=>addPoint("p1",-1)}>−</button>
            </div>
          </div>

          <div className="panel">
            <input className="input" placeholder="Player 3" value={s.players["2a"].name} onChange={(e)=>updatePlayer("2a","name",e.target.value)} />
            <select className="input" value={s.players["2a"].cc} onChange={(e)=>updatePlayer("2a","cc",e.target.value)}>
              {COUNTRIES.map(([f,n])=><option key={f+n} value={f}>{f} {n}</option>)}
            </select>
            <input className="input" placeholder="Player 4" value={s.players["2b"].name} onChange={(e)=>updatePlayer("2b","name",e.target.value)} />
            <select className="input" value={s.players["2b"].cc} onChange={(e)=>updatePlayer("2b","cc",e.target.value)}>
              {COUNTRIES.map(([f,n])=><option key={f+n} value={f}>{f} {n}</option>)}
            </select>
            <div className="btnRow">
              <button className="btn" onClick={()=>addPoint("p2",+1)}>+</button>
              <button className="btn" onClick={()=>addPoint("p2",-1)}>−</button>
            </div>
          </div>
        </div>

        <div className="footer">
          <button className="btnSm danger" onClick={resetGame}>Reset Game</button>
          <button className="btnSm gold" onClick={newMatch}>New Match</button>
          <button className="btnSm" onClick={toggleServer}>Serve🎾</button>
        </div>
      </div>
    </main>
  );
}

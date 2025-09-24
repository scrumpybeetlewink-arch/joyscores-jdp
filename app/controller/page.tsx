// @ts-nocheck
"use client";

export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
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

/** ---------- Countries ---------- */
const COUNTRIES: Array<[flag: string, name: string]> = [
  ["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇹🇭","Thailand"],["🇮🇩","Indonesia"],["🇵🇭","Philippines"],
  ["🇻🇳","Vietnam"],["🇮🇳","India"],["🇯🇵","Japan"],["🇰🇷","South Korea"],["🇨🇳","China"],
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇫🇷","France"],["🇩🇪","Germany"],
  ["🇪🇸","Spain"],["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],
  ["🏳️","(None)"]
];

/** ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;
const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

/** ---------- Defaults ---------- */
const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
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
  ts: undefined,
};

function normalize(v: any): ScoreState {
  const safe: ScoreState = {
    ...defaultState,
    meta: {
      name: v?.meta?.name ?? "",
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
  return safe;
}

/** ========================================================= */
export default function ControllerPage() {
  const defaultPath = "/joyscores/court1";
  const [path] = useState<string>(defaultPath);

  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, path), (snap) => setS(normalize(snap.val())));
    })();
    return () => unsub?.();
  }, [path]);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, path), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1;
    n.points = { p1: 0, p2: 0 };
    const gA = n.games.p1, gB = n.games.p2;
    if ((gA >= 6 || gB >= 6) && Math.abs(gA - gB) >= 2) {
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
      meta: { name: s.meta?.name || "Court 1", bestOf: s.meta?.bestOf ?? 3 },
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
    return (
      <div className="row" style={{display:"grid",gridTemplateColumns:"1fr 3.2em minmax(0,1fr)",gap:"0.75em",alignItems:"center",fontSize:"1.5em"}}>
        <div className="teamline" style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{teamLine}</div>
        <div className="serveCol" style={{textAlign:"center"}}>{s.server===side?"🎾":""}</div>
        <div className="scoreGrid" style={{display:"grid",gridTemplateColumns:`repeat(${maxSets+1},1fr)`,gap:".4em"}}>
          {setCells.map((v,i)=><div key={i} className="setBox" style={{fontSize:"1em",background:"var(--c-muted)",color:"#0b1419",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"2.1em",fontWeight:700}}>{v}</div>)}
          <div className="pointsBox" style={{fontSize:"1em",background:"var(--c-muted)",color:"#0b1419",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"2.1em",fontWeight:700}}>{String(pointsLabel)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pageWrap" style={{ background: "var(--c-ink)", minHeight: "100vh" }}>
      <style>{`/* (keep your CSS here — unchanged for brevity) */`}</style>
      <div className="container" style={{ width:"min(1200px,95vw)", paddingTop:18, paddingBottom:24 }}>
        <div className="card cardRoot">
          <div className="headerBar" style={{ justifyContent:"space-between", alignItems:"end" }}>
            <div className="courtName">{s.meta?.name || "Court"}</div>
            <select className="input bestOfSelect" value={s.meta?.bestOf ?? 3} onChange={(e)=>updateBestOf(Number(e.target.value) as BestOf)}>
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>
          {renderRow("p1")}
          {renderRow("p2")}
          {/* Teams + buttons identical to your original UI */}
          {/* ... */}
          <div className="footerControls" style={{display:"flex",gap:".75rem",justifyContent:"center",marginTop:".75rem"}}>
            <button className="btn btn-danger btn-lg" onClick={resetGame}>Reset Game</button>
            <button className="btn btn-gold btn-lg" onClick={newMatch}>New Match</button>
            <button className="btn btn-lg" onClick={toggleServer}>Serve🎾</button>
          </div>
        </div>
      </div>
    </div>
  );
}

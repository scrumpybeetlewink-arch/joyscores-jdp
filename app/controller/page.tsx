"use client";

import { useEffect, useState, useMemo } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";
import { useSearchParams } from "next/navigation";

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

const COUNTRIES: Array<[string, string]> = [
  ["🇲🇾", "Malaysia"], ["🇸🇬", "Singapore"], ["🇹🇭", "Thailand"], ["🇮🇩", "Indonesia"],
  ["🇵🇭", "Philippines"], ["🇻🇳", "Vietnam"], ["🇮🇳", "India"], ["🇯🇵", "Japan"],
  ["🇰🇷", "South Korea"], ["🇨🇳", "China"], ["🇺🇸", "United States"], ["🇨🇦", "Canada"],
  ["🇬🇧", "United Kingdom"], ["🇫🇷", "France"], ["🇩🇪", "Germany"], ["🇪🇸", "Spain"],
  ["🇮🇹", "Italy"], ["🇧🇷", "Brazil"], ["🇦🇷", "Argentina"], ["🇿🇦", "South Africa"],
  ["🏳️", "(None)"]
];

/** ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fb: string) => (n?.trim() ? n : fb);
const nextPoint = (p: Point): Point => p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point => p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: { "1a": { name: "", cc: "🇲🇾" }, "1b": { name: "", cc: "🇲🇾" }, "2a": { name: "", cc: "🇲🇾" }, "2b": { name: "", cc: "🇲🇾" } },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  tiebreak: false,
  tb: { p1: 0, p2: 0 },
  server: "p1",
};

function normalize(v: any): ScoreState {
  return {
    ...defaultState,
    meta: { name: v?.meta?.name ?? "", bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf },
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
  };
}

export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const searchParams = useSearchParams();
  const courtId = searchParams.get("court") || "court1";

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, `/courts/${courtId}`), snap => setS(normalize(snap.val())));
    })();
    return () => unsub?.();
  }, [courtId]);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, `/courts/${courtId}`), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();
    if (dir === 1) {
      const opp: Side = side === "p1" ? "p2" : "p1";
      const ps = n.points[side], po = n.points[opp];
      if (ps === 40 && (po === 0 || po === 15 || po === 30)) { n.games[side]++; n.points = { p1: 0, p2: 0 }; }
      else if (ps === 40 && po === "Ad") n.points[opp] = 40;
      else if (ps === 40 && po === 40) n.points[side] = "Ad";
      else if (ps === "Ad") { n.games[side]++; n.points = { p1: 0, p2: 0 }; }
      else n.points[side] = nextPoint(ps);
    } else n.points[side] = prevPoint(n.points[side]);
    commit(n);
  }

  function toggleServer() { const n = clone(); n.server = n.server === "p1" ? "p2" : "p1"; commit(n); }
  function newMatch() { commit(defaultState); }

  const maxSets = useMemo(() => ((s.meta.bestOf ?? 3) === 5 ? 5 : 3), [s.meta.bestOf]);

  const Row = ({ side }: { side: Side }) => {
    const players = s.players, sets = s.sets, games = s.games;
    const p1a = nameOrLabel(players["1a"].name, "Player 1");
    const p1b = nameOrLabel(players["1b"].name, "Player 2");
    const p2a = nameOrLabel(players["2a"].name, "Player 3");
    const p2b = nameOrLabel(players["2b"].name, "Player 4");
    const line = side === "p1" ? `${flag(players["1a"].cc)} ${p1a} / ${flag(players["1b"].cc)} ${p1b}` : `${flag(players["2a"].cc)} ${p2a} / ${flag(players["2b"].cc)} ${p2b}`;
    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finished) return side === "p1" ? sets.p1[i] ?? "" : sets.p2[i] ?? "";
      if (i === finished) return side === "p1" ? games.p1 ?? "" : games.p2 ?? "";
      return "";
    });
    const points = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    return (
      <div className="row">
        <div className="teamline">{line}</div>
        <div className="serve">{s.server === side ? "🎾" : ""}</div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${maxSets + 1},1fr)` }}>
          {setCells.map((v, i) => <div key={i} className="box">{v}</div>)}
          <div className="box">{String(points)}</div>
        </div>
      </div>
    );
  };

  return (
    <main className="wrap">
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --primary:#124E66; --muted:#748D92; --cloud:#D3D9D4; }
        .wrap{ background:var(--ink); min-height:100vh; padding:20px; }
        .card{ background:var(--ink2); color:#fff; border-radius:16px; padding:1.2rem; box-shadow:0 6px 20px rgba(0,0,0,.25); max-width:1100px; margin:auto; }
        .head{ display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1rem; }
        .title{ font-size:1.4em; font-weight:800; color:var(--cloud); }
        .select{ width:12em; border-radius:9999px; height:2.6em; margin-left:.8rem; }

        .row{ display:grid; grid-template-columns:1fr 2.8em minmax(0,1fr); gap:.8rem; align-items:center; font-size:1.2em; margin:.6rem 0; }
        .teamline{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .grid{ display:grid; gap:.4rem; }
        .box{ background:var(--muted); color:#0b1419; border-radius:10px; min-height:2.4em; display:flex; align-items:center; justify-content:center; font-weight:800; }

        .panelGrid{ display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; margin-top:1.2rem; }
        .panel{ background:rgba(33,42,49,.45); border-radius:12px; padding:1rem; display:flex; flex-direction:column; gap:.9rem; }
        .input{ background:#D3D9D4; color:#0b1419; border-radius:10px; height:2.6em; padding:0 .9em; }

        .btnRow{ display:flex; gap:.8rem; flex-wrap:wrap; margin-top:1rem; justify-content:center; }
        .btn{ background:var(--primary); color:#fff; border-radius:12px; height:2.8em; padding:0 1.1em; font-weight:700; }
        .btn-danger{ background:#8b2e2e; }
        .btn-gold{ background:var(--muted); color:#0b1419; }
      `}</style>

      <section className="card">
        <div className="head">
          <div className="title">{s.meta.name || courtId}</div>
          <select className="select input" value={s.meta.bestOf} onChange={e => commit({ ...s, meta: { ...s.meta, bestOf: Number(e.target.value) as BestOf } })}>
            <option value={3}>Best of 3</option>
            <option value={5}>Best of 5</option>
          </select>
        </div>

        <Row side="p1" />
        <Row side="p2" />

        <div className="panelGrid">
          {(["1a", "1b", "2a", "2b"] as const).map((key, idx) => (
            <div key={key} className="panel">
              <label>{`Player ${idx + 1}`}</label>
              <input className="input" value={s.players[key].name} placeholder="Enter name"
                onChange={e => commit({ ...s, players: { ...s.players, [key]: { ...s.players[key], name: e.target.value } } })}/>
              <select className="input" value={s.players[key].cc}
                onChange={e => commit({ ...s, players: { ...s.players, [key]: { ...s.players[key], cc: e.target.value } } })}>
                {COUNTRIES.map(([f, n]) => <option key={f} value={f}>{f} {n}</option>)}
              </select>
              <div style={{ display:"flex", gap:".6rem" }}>
                <button className="btn" onClick={() => addPoint(idx < 2 ? "p1" : "p2", +1)}>+</button>
                <button className="btn" onClick={() => addPoint(idx < 2 ? "p1" : "p2", -1)}>−</button>
              </div>
            </div>
          ))}
        </div>

        <div className="btnRow">
          <button className="btn btn-danger" onClick={() => newMatch()}>New Match</button>
          <button className="btn btn-gold" onClick={() => toggleServer()}>Toggle Serve 🎾</button>
        </div>
      </section>
    </main>
  );
}

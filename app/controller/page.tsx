"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

export const dynamic = "force-static";

/* ---------- Types ---------- */
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

/* ---------- Defaults ---------- */
const COUNTRIES: Array<[flag: string, name: string]> = [
  ["🇲🇾", "Malaysia"], ["🇸🇬", "Singapore"], ["🇹🇭", "Thailand"], ["🇮🇩", "Indonesia"], ["🇵🇭", "Philippines"],
  ["🇻🇳", "Vietnam"], ["🇮🇳", "India"], ["🇯🇵", "Japan"], ["🇰🇷", "South Korea"], ["🇨🇳", "China"],
  ["🇺🇸", "United States"], ["🇨🇦", "Canada"], ["🇬🇧", "United Kingdom"], ["🇫🇷", "France"], ["🇩🇪", "Germany"],
  ["🇪🇸", "Spain"], ["🇮🇹", "Italy"], ["🇧🇷", "Brazil"], ["🇦🇷", "Argentina"], ["🇿🇦", "South Africa"],
  ["🏳️", "(None)"],
];

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

/* ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOr = (n: string, fallback: string) => (n?.trim() ? n : fallback);

const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";

const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

/* ---------- Normalize snapshot ---------- */
function normalize(v: any): ScoreState {
  if (!v) return defaultState;
  return {
    ...defaultState,
    ...v,
    meta: { name: v?.meta?.name ?? "", bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf },
    players: {
      "1a": { name: v?.players?.["1a"]?.name ?? "", cc: v?.players?.["1a"]?.cc ?? "🇲🇾" },
      "1b": { name: v?.players?.["1b"]?.name ?? "", cc: v?.players?.["1b"]?.cc ?? "🇲🇾" },
      "2a": { name: v?.players?.["2a"]?.name ?? "", cc: v?.players?.["2a"]?.cc ?? "🇲🇾" },
      "2b": { name: v?.players?.["2b"]?.name ?? "", cc: v?.players?.["2b"]?.cc ?? "🇲🇾" },
    },
    points: {
      p1: (v?.points?.p1 ?? 0) as Point,
      p2: (v?.points?.p2 ?? 0) as Point,
    },
    games: {
      p1: Number.isFinite(v?.games?.p1) ? v.games.p1 : 0,
      p2: Number.isFinite(v?.games?.p2) ? v.games.p2 : 0,
    },
    sets: {
      p1: Array.isArray(v?.sets?.p1) ? v.sets.p1 : [],
      p2: Array.isArray(v?.sets?.p2) ? v.sets.p2 : [],
    },
    tiebreak: !!v?.tiebreak,
    tb: {
      p1: Number.isFinite(v?.tb?.p1) ? v.tb.p1 : 0,
      p2: Number.isFinite(v?.tb?.p2) ? v.tb.p2 : 0,
    },
    server: v?.server === "p1" || v?.server === "p2" ? v.server : "p1",
  };
}

/* =========================================================
 *  Controller (reads/writes RTDB; query param ?court=court1)
 * =========================================================
 */
function ControllerInner() {
  const qp = useSearchParams();
  const court = (qp.get("court") || "court1").trim() || "court1";
  const PATH = `/courts/${court}`;
  const NAME_PATH = `${PATH}/meta/name`;

  const [s, setS] = useState<ScoreState>(defaultState);
  const [externalCourtName, setExternalCourtName] = useState<string>("");

  // Subscribe
  useEffect(() => {
    let offScore = () => {};
    let offName = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      offScore = onValue(ref(db, PATH), (snap) => setS(normalize(snap.val())));
      offName = onValue(ref(db, NAME_PATH), (snap) => {
        const v = snap.val();
        setExternalCourtName(typeof v === "string" ? v : "");
      });
    })();
    return () => { offScore?.(); offName?.(); };
  }, [PATH, NAME_PATH]);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, PATH), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1;
    n.points = { p1: 0, p2: 0 };
    const gA = n.games.p1, gB = n.games.p2;
    const lead = Math.abs(gA - gB);

    if ((gA >= 6 || gB >= 6) && lead >= 2) {
      n.sets.p1.push(gA); n.sets.p2.push(gB);
      n.games = { p1: 0, p2: 0 };
      n.tiebreak = false; n.tb = { p1: 0, p2: 0 };
    } else if (gA === 6 && gB === 6) {
      n.tiebreak = true; n.tb = { p1: 0, p2: 0 };
    }
  }

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();

    if (n.tiebreak) {
      n.tb[side] = Math.max(0, n.tb[side] + dir);
      const a = n.tb.p1, b = n.tb.p2;
      if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) {
        if (a > b) { n.sets.p1.push(n.games.p1 + 1); n.sets.p2.push(n.games.p2); }
        else { n.sets.p2.push(n.games.p2 + 1); n.sets.p1.push(n.games.p1); }
        n.games = { p1: 0, p2: 0 };
        n.points = { p1: 0, p2: 0 };
        n.tiebreak = false; n.tb = { p1: 0, p2: 0 };
      }
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

  function resetGame() {
    const n = clone();
    const { p1: g1, p2: g2 } = n.games;
    if (g1 > g2) n.games.p1 = Math.max(0, g1 - 1);
    else if (g2 > g1) n.games.p2 = Math.max(0, g2 - 1);
    commit(n);
  }

  function newMatch() {
    commit({
      ...defaultState,
      meta: { name: externalCourtName, bestOf: (s.meta?.bestOf ?? 3) as BestOf },
      players: {
        "1a": { name: "", cc: "🇲🇾" },
        "1b": { name: "", cc: "🇲🇾" },
        "2a": { name: "", cc: "🇲🇾" },
        "2b": { name: "", cc: "🇲🇾" },
      },
      server: "p1",
      ts: Date.now(),
    });
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

  const maxSets = useMemo(() => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s.meta?.bestOf]);

  /* ---------- UI ---------- */
  function Row({ side }: { side: Side }) {
    const players = s.players ?? defaultState.players;
    const sets = s.sets ?? defaultState.sets;
    const games = s.games ?? defaultState.games;

    const p1a = nameOr(players["1a"]?.name, "Player 1");
    const p1b = nameOr(players["1b"]?.name, "Player 2");
    const p2a = nameOr(players["2a"]?.name, "Player 3");
    const p2b = nameOr(players["2b"]?.name, "Player 4");

    const teamLine =
      side === "p1"
        ? `${flag(players["1a"]?.cc)} ${p1a} / ${flag(players["1b"]?.cc)} ${p1b}`
        : `${flag(players["2a"]?.cc)} ${p2a} / ${flag(players["2b"]?.cc)} ${p2b}`;

    const finishedCount = Math.max(sets.p1?.length ?? 0, sets.p2?.length ?? 0);

    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finishedCount) return side === "p1" ? (sets.p1?.[i] ?? "") : (sets.p2?.[i] ?? "");
      if (i === finishedCount) return side === "p1" ? (games?.p1 ?? "") : (games?.p2 ?? "");
      return "";
    });

    const pointsLabel = s.tiebreak ? `TB ${(s.tb ?? defaultState.tb)[side]}` : (s.points ?? defaultState.points)[side];

    return (
      <div className="row">
        <div className="teamline">{teamLine}</div>
        <div className="serve">{s.server === side ? "🎾" : ""}</div>
        <div className="scoreGrid" style={{ gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => (
            <div key={i} className="box">{v}</div>
          ))}
          <div className="box">{String(pointsLabel)}</div>
        </div>
      </div>
    );
  }

  return (
    <main className="wrap">
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --primary:#124E66; --muted:#748D92; --cloud:#D3D9D4; }
        .wrap{ background:var(--ink); min-height:100vh; padding:18px 2vw; color:#fff; }
        .container{ margin:0 auto; width:min(1100px,92vw); }
        .card{ background:var(--ink2); color:#fff; border:1px solid rgba(0,0,0,.15); border-radius:16px; padding:1.25rem; box-shadow:0 6px 20px rgba(0,0,0,.25); }

        .head{ display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:10px; }
        .title{ color:var(--cloud); font-size:1.4em; font-weight:800; }
        .select{ width:12em; border-radius:9999px; height:2.6em; background:var(--cloud); color:#0b1419; border:1px solid var(--muted); padding:0 .9em; }

        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.32em; margin:10px 0; }
        .teamline{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .scoreGrid{ display:grid; gap:.6rem; } /* spacing mirrors Live */
        .box{ background:var(--muted); color:#0b1419; border-radius:12px; min-height:2.6em; display:flex; align-items:center; justify-content:center; font-weight:800; }

        .panelGrid{ display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:1rem; }
        .panel{ background:rgba(33,42,49,.45); border:1px solid rgba(211,217,212,.12); border-radius:12px; padding:1rem; }

        .input{ width:100%; background:var(--cloud); color:#0b1419; border:1px solid var(--muted); border-radius:10px; height:2.6em; padding:0 .9em; }
        .input::placeholder{ color: var(--muted); }
        .btn{ border:1px solid transparent; background:var(--primary); color:#fff; border-radius:12px; height:2.8em; padding:0 1.1em; font-weight:700; font-size:1em; }
        .pm{ font-size:2.2em; line-height:1; } /* bigger +/- like approved */
        .btn-danger{ background:#8b2e2e; }
        .btn-gold{ background:var(--muted); color:#0b1419; }
      `}</style>

      <section className="container">
        <div className="card">
          {/* Header */}
          <div className="head">
            <div className="title">{externalCourtName || court}</div>
            <select
              aria-label="Best of"
              className="input select"
              value={s.meta?.bestOf ?? 3}
              onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}
            >
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>

          {/* Score rows */}
          <Row side="p1" />
          <Row side="p2" />

          <div style={{ height: 1, background: "rgba(211,217,212,.18)", margin: "1rem 0" }} />

          {/* Team panels */}
          <div className="panelGrid">
            {/* TEAM A */}
            <div className="panel">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <div style={{ display: "grid", gap: ".4rem" }}>
                  <label style={{ color: "var(--cloud)" }}>Player 1</label>
                  <input className="input" placeholder="Enter Name" value={s.players["1a"].name} onChange={(e) => updatePlayer("1a","name",e.target.value)} />
                  <select className="input" value={s.players["1a"].cc} onChange={(e) => updatePlayer("1a","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => <option key={`${f}-${n}`} value={f}>{f} {n}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gap: ".4rem" }}>
                  <label style={{ color: "var(--cloud)" }}>Player 2</label>
                  <input className="input" placeholder="Enter Name" value={s.players["1b"].name} onChange={(e) => updatePlayer("1b","name",e.target.value)} />
                  <select className="input" value={s.players["1b"].cc} onChange={(e) => updatePlayer("1b","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => <option key={`${f}-${n}`} value={f}>{f} {n}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem", marginTop:".75rem" }}>
                <button className="btn pm" onClick={() => addPoint("p1", +1)}>+</button>
                <button className="btn pm" onClick={() => addPoint("p1", -1)}>−</button>
              </div>
            </div>

            {/* TEAM B */}
            <div className="panel">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <div style={{ display: "grid", gap: ".4rem" }}>
                  <label style={{ color: "var(--cloud)" }}>Player 3</label>
                  <input className="input" placeholder="Enter Name" value={s.players["2a"].name} onChange={(e) => updatePlayer("2a","name",e.target.value)} />
                  <select className="input" value={s.players["2a"].cc} onChange={(e) => updatePlayer("2a","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => <option key={`${f}-${n}`} value={f}>{f} {n}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gap: ".4rem" }}>
                  <label style={{ color: "var(--cloud)" }}>Player 4</label>
                  <input className="input" placeholder="Enter Name" value={s.players["2b"].name} onChange={(e) => updatePlayer("2b","name",e.target.value)} />
                  <select className="input" value={s.players["2b"].cc} onChange={(e) => updatePlayer("2b","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => <option key={`${f}-${n}`} value={f}>{f} {n}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem", marginTop:".75rem" }}>
                <button className="btn pm" onClick={() => addPoint("p2", +1)}>+</button>
                <button className="btn pm" onClick={() => addPoint("p2", -1)}>−</button>
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div style={{ display:"flex", gap:".75rem", flexWrap:"wrap", justifyContent:"center", alignItems:"center", marginTop:".75rem" }}>
            <button className="btn btn-danger" onClick={resetGame}>Reset Game</button>
            <button className="btn btn-gold" onClick={newMatch}>New Match</button>
            <button className="btn" onClick={toggleServer} title="Toggle server">Serve 🎾</button>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- Export with Suspense (for useSearchParams) ---------- */
export default function ControllerPage() {
  return (
    <Suspense fallback={null}>
      <ControllerInner />
    </Suspense>
  );
}

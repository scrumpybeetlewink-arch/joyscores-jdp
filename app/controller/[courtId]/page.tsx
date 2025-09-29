"use client";
export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  ["🇪🇸","Spain"],["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],["🏳️","(None)"]
];

/** ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
type DefP = 0 | 15 | 30 | 40 | "Ad";
const nextPoint = (p: DefP): DefP => (p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad");
const prevPoint = (p: DefP): DefP => (p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40);
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

/** ---------- Normalize snapshot ---------- */
function normalize(v: any): ScoreState {
  const s = v ?? {};
  return {
    ...defaultState,
    meta: { name: s?.meta?.name ?? "", bestOf: (s?.meta?.bestOf === 5 ? 5 : 3) as BestOf },
    players: {
      "1a": { name: s?.players?.["1a"]?.name ?? "", cc: s?.players?.["1a"]?.cc ?? "🇲🇾" },
      "1b": { name: s?.players?.["1b"]?.name ?? "", cc: s?.players?.["1b"]?.cc ?? "🇲🇾" },
      "2a": { name: s?.players?.["2a"]?.name ?? "", cc: s?.players?.["2a"]?.cc ?? "🇲🇾" },
      "2b": { name: s?.players?.["2b"]?.name ?? "", cc: s?.players?.["2b"]?.cc ?? "🇲🇾" },
    },
    points: { p1: (s?.points?.p1 ?? 0) as Point, p2: (s?.points?.p2 ?? 0) as Point },
    games: { p1: Number.isFinite(s?.games?.p1) ? s.games.p1 : 0, p2: Number.isFinite(s?.games?.p2) ? s.games.p2 : 0 },
    sets: { p1: Array.isArray(s?.sets?.p1) ? s.sets.p1 : [], p2: Array.isArray(s?.sets?.p2) ? s.sets.p2 : [] },
    tiebreak: !!s?.tiebreak,
    tb: { p1: Number.isFinite(s?.tb?.p1) ? s.tb.p1 : 0, p2: Number.isFinite(s?.tb?.p2) ? s.tb.p2 : 0 },
    server: s?.server === "p1" || s?.server === "p2" ? s.server : "p1",
    ts: typeof s?.ts === "number" ? s.ts : undefined,
  };
}

/** =========================================================
 *  Controller (multi-court)
 *  =========================================================
 */
export default function ControllerPage() {
  const params = useParams<{ courtId: string }>();
  const courtId = params?.courtId || "court1";
  const COURT_PATH = `/courts/${courtId}`;
  const META_NAME_PATH = `/courts/${courtId}/meta/name`;

  const [s, setS] = useState<ScoreState>(defaultState);
  const [externalCourtName, setExternalCourtName] = useState<string>("");

  useEffect(() => {
    let unsubScore = () => {};
    let unsubName = () => {};

    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsubScore = onValue(ref(db, COURT_PATH), (snap) => setS(normalize(snap.val())));
      unsubName = onValue(ref(db, META_NAME_PATH), (snap) => setExternalCourtName(typeof snap.val() === "string" ? snap.val() : ""));
    })();

    return () => { unsubScore?.(); unsubName?.(); };
  }, [COURT_PATH, META_NAME_PATH]);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  }
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
      if (ps === 40 && (po === 0 || po === 15 || po === 30)) winGame(n, side);
      else if (ps === 40 && po === "Ad") n.points[opp] = 40;
      else if (ps === 40 && po === 40) n.points[side] = "Ad";
      else if (ps === "Ad") winGame(n, side);
      else n.points[side] = nextPoint(ps as DefP);
    } else {
      n.points[side] = prevPoint(n.points[side] as DefP);
    }
    commit(n);
  }

  function toggleServer() { const n = clone(); n.server = n.server === "p1" ? "p2" : "p1"; commit(n); }
  function resetGame() {
    const n = clone(); const { p1: g1, p2: g2 } = n.games;
    if (g1 > g2) n.games.p1 = Math.max(0, g1 - 1); else if (g2 > g1) n.games.p2 = Math.max(0, g2 - 1);
    commit(n);
  }
  function newMatch() {
    commit({
      ...defaultState,
      meta: { name: externalCourtName, bestOf: (s.meta?.bestOf ?? 3) as BestOf },
      players: { "1a": { name: "", cc: "🇲🇾" }, "1b": { name: "", cc: "🇲🇾" }, "2a": { name: "", cc: "🇲🇾" }, "2b": { name: "", cc: "🇲🇾" } },
      server: "p1",
      ts: Date.now(),
    });
  }
  async function updatePlayer(key: "1a"|"1b"|"2a"|"2b", field: "name"|"cc", val: string) {
    const n = clone(); (n.players[key] as any)[field] = val; await commit(n);
  }
  async function updateBestOf(v: BestOf) { const n = clone(); n.meta.bestOf = v; await commit(n); }

  const maxSets = useMemo(() => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s.meta?.bestOf]);

  function renderRow(side: Side) {
    const players = s.players ?? defaultState.players;
    const sets = s.sets ?? defaultState.sets;
    const games = s.games ?? defaultState.games;

    const p1a = nameOrLabel(players["1a"]?.name, "Player 1");
    const p1b = nameOrLabel(players["1b"]?.name, "Player 2");
    const p2a = nameOrLabel(players["2a"]?.name, "Player 3");
    const p2b = nameOrLabel(players["2b"]?.name, "Player 4");

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
        <div className="grid" style={{ gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => (
            <div key={i} className="box">{v}</div>
          ))}
          <div className="box">{String(pointsLabel)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pageWrap">
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --primary:#124E66; --muted:#748D92; --cloud:#D3D9D4; }
        .pageWrap{ background:var(--ink); min-height:100vh; padding:18px 2vw; color:#fff; }
        .container{ margin:0 auto; width:min(1100px,92vw); }
        .card{ background:var(--ink2); color:#fff; border:1px solid rgba(0,0,0,0.15); border-radius:16px; padding:1.25rem; box-shadow:0 6px 20px rgba(0,0,0,0.25); }

        .headerBar{ display:flex; gap:1rem; padding:0 0 .7rem; justify-content:space-between; align-items:flex-end; border-bottom:1px solid rgba(211,217,212,0.16); }
        .courtName{ color:var(--cloud); font-size:1.5em; font-weight:800; }
        .bestOfSelect{ width:12em; border-radius:9999px; height:2.6em; background:var(--cloud); color:#0b1419; border:1px solid var(--muted); padding:0 .9em; }

        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.28em; margin:10px 0; }
        .teamline{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--cloud); }
        .serve{ text-align:center; }
        .grid{ display:grid; gap:.6rem; } /* match LIVE spacing */
        .box{ background:var(--muted); color:#0b1419; border-radius:12px; min-height:2.4em; display:flex; align-items:center; justify-content:center; font-weight:800; }

        .teamsGrid{ display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; align-items: stretch; }
        @media (max-width: 800px){ .teamsGrid{ grid-template-columns: 1fr; } }

        .teamCard{ background: rgba(33,42,49,0.45); border: 1px solid rgba(211,217,212,0.12); border-radius: 12px; padding: 1rem; }

        .input{ width: 100%; background: #D3D9D4; color: #0b1419; border: 1px solid var(--muted); border-radius: 10px; height: 2.6em; padding: 0 .9em; font-size: 1em; }
        .btn{ border: 1px solid transparent; background: var(--primary); color: #fff; border-radius: 12px; height: 3.2em; padding: 0 1.1em; font-weight: 700; font-size: 1em; }
        .btn-danger{ background: #8b2e2e; }
        .pm{ font-size: 2.3em; }
      `}</style>

      <div className="container">
        <div className="card">
          <div className="headerBar">
            <div className="courtName">{externalCourtName || "Court"}</div>
            <select
              aria-label="Best of"
              className="bestOfSelect"
              value={s.meta?.bestOf ?? 3}
              onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}
            >
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>

          {renderRow("p1")}
          {renderRow("p2")}

          <hr style={{ opacity: .15, margin: "12px 0" }} />

          <div className="teamsGrid">
            <div className="teamCard">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <div>
                  <label>Player 1</label>
                  <input className="input" placeholder="Enter Name" value={s.players["1a"].name} onChange={(e) => updatePlayer("1a","name",e.target.value)} />
                  <select className="input" value={s.players["1a"].cc} onChange={(e) => updatePlayer("1a","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => <option key={`${f}-${n}`} value={f}>{f} {n}</option>)}
                  </select>
                </div>
                <div>
                  <label>Player 2</label>
                  <input className="input" placeholder="Enter Name" value={s.players["1b"].name} onChange={(e) => updatePlayer("1b","name",e.target.value)} />
                  <select className="input" value={s.players["1b"].cc} onChange={(e) => updatePlayer("1b","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => <option key={`${f}-${n}`} value={f}>{f} {n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginTop: ".75rem" }}>
                <button className="btn pm" onClick={() => addPoint("p1", +1)}>+</button>
                <button className="btn pm" onClick={() => addPoint("p1", -1)}>−</button>
              </div>
            </div>

            <div className="teamCard">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <div>
                  <label>Player 3</label>
                  <input className="input" placeholder="Enter Name" value={s.players["2a"].name} onChange={(e) => updatePlayer("2a","name",e.target.value)} />
                  <select className="input" value={s.players["2a"].cc} onChange={(e) => updatePlayer("2a","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => <option key={`${f}-${n}`} value={f}>{f} {n}</option>)}
                  </select>
                </div>
                <div>
                  <label>Player 4</label>
                  <input className="input" placeholder="Enter Name" value={s.players["2b"].name} onChange={(e) => updatePlayer("2b","name",e.target.value)} />
                  <select className="input" value={s.players["2b"].cc} onChange={(e) => updatePlayer("2b","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => <option key={`${f}-${n}`} value={f}>{f} {n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginTop: ".75rem" }}>
                <button className="btn pm" onClick={() => addPoint("p2", +1)}>+</button>
                <button className="btn pm" onClick={() => addPoint("p2", -1)}>−</button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: ".6rem", justifyContent: "center", flexWrap: "wrap", marginTop: ".9rem" }}>
            <button className="btn btn-danger" onClick={resetGame}>Reset Game</button>
            <button className="btn" onClick={newMatch} style={{ background: "#5b6b72" }}>New Match</button>
            <button className="btn" onClick={toggleServer} title="Toggle server">Serve🎾</button>
          </div>
        </div>
      </div>
    </div>
  );
}

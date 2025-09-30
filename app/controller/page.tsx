"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

/* ---------- Types ---------- */
type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;

type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf; golden?: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  tiebreak: boolean;
  tb: Record<Side, number>;
  server: Side | null;
  ts?: number;
};

/* ---------- Court selection (fixed single-court) ---------- */
const court = "court1";
const COURT_PATH = `/courts/${court}`;
const META_NAME_PATH = `/courts/${court}/meta/name`;

/* ---------- Constants ---------- */
const COUNTRIES: Array<[flag: string, name: string]> = [
  ["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇹🇭","Thailand"],["🇮🇩","Indonesia"],["🇵🇭","Philippines"],
  ["🇻🇳","Vietnam"],["🇮🇳","India"],["🇯🇵","Japan"],["🇰🇷","South Korea"],["🇨🇳","China"],
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇫🇷","France"],["🇩🇪","Germany"],
  ["🇪🇸","Spain"],["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],
  ["🏳️","(None)"]
];

const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

/* ---------- Defaults ---------- */
const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3, golden: false },
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

/* ---------- Normalize (RTDB → safe) ---------- */
function normalize(v: any): ScoreState {
  const safe: ScoreState = {
    meta: {
      name: v?.meta?.name ?? "",
      bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
      golden: !!v?.meta?.golden,
    },
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
    ts: typeof v?.ts === "number" ? v.ts : undefined,
  };
  return safe;
}

/* =========================================================
 * Controller
 * =======================================================*/
export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [externalCourtName, setExternalCourtName] = useState<string>("");

  useEffect(() => {
    let unsubScore = () => {};
    let unsubName = () => {};

    (async () => {
      try { await ensureAnonLogin(); } catch {}
      const scoreRef = ref(db, COURT_PATH);
      const nameRef = ref(db, META_NAME_PATH);

      unsubScore = onValue(scoreRef, (snap) => {
        const v = snap.val();
        setS(v ? normalize(v) : defaultState);
      });

      unsubName = onValue(nameRef, (snap) => {
        const v = snap.val();
        setExternalCourtName(typeof v === "string" ? v : "");
      });
    })();

    return () => { unsubScore?.(); unsubName?.(); };
  }, []);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  /* ---------- Scoring helpers ---------- */
  function pushSetAndReset(n: ScoreState, winner: Side) {
    const a = n.games.p1, b = n.games.p2;
    if (winner === "p1") { n.sets.p1.push(a + 1); n.sets.p2.push(b); }
    else { n.sets.p2.push(b + 1); n.sets.p1.push(a); }
    n.games = { p1: 0, p2: 0 };
    n.points = { p1: 0, p2: 0 };
    n.tiebreak = false;
    n.tb = { p1: 0, p2: 0 };
  }

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

    // Tie-break handling
    if (n.tiebreak) {
      if (dir === 1) n.tb[side] += 1;
      else n.tb[side] = Math.max(0, n.tb[side] - 1);
      const a = n.tb.p1, b = n.tb.p2;
      if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) pushSetAndReset(n, a > b ? "p1" : "p2");
      return commit(n);
    }

    // Golden Point at deuce (40–40)
    const golden = !!n.meta.golden;
    if (golden && dir === 1) {
      const p1 = n.points.p1, p2 = n.points.p2;
      if (p1 === 40 && p2 === 40) { winGame(n, side); return commit(n); }
    }

    // Normal advantage scoring
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

  function resetPoints() {
    const n = clone();
    n.points = { p1: 0, p2: 0 };
    n.tiebreak = false;
    n.tb = { p1: 0, p2: 0 };
    commit(n);
  }

  // Roll back exactly one game from the leading side
  function resetLastGame() {
    const n = clone();
    const g1 = n.games.p1, g2 = n.games.p2;
    if (g1 > g2) n.games.p1 = Math.max(0, g1 - 1);
    else if (g2 > g1) n.games.p2 = Math.max(0, g2 - 1);
    n.points = { p1: 0, p2: 0 };
    n.tiebreak = false;
    n.tb = { p1: 0, p2: 0 };
    commit(n);
  }

  function newMatch() {
    commit({
      ...defaultState,
      meta: { name: externalCourtName, bestOf: (s.meta?.bestOf ?? 3) as BestOf, golden: !!s.meta?.golden },
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

  async function toggleGolden() {
    const n = clone();
    n.meta.golden = !n.meta.golden;
    await commit(n);
  }

  const maxSets = useMemo(() => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s.meta?.bestOf]);

  /* ---------- Row ---------- */
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
      <div
        className="row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 3rem minmax(0,1fr)",
          gap: "1rem",
          alignItems: "center",
          fontSize: "1.35em",
          margin: "10px 0",
        }}
      >
        <div className="teamline" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {teamLine}
        </div>

        <div className="serveCol" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          {s.server === side && <span aria-label="serving" title="Serving" style={{ fontSize: "1em", lineHeight: 1 }}>🎾</span>}
        </div>

        <div
          className="scoreGrid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)`,
            gap: ".6rem",
          }}
        >
          {setCells.map((v, i) => (
            <div key={i} className="setBox scoreBox">{v}</div>
          ))}
          <div className="pointsBox scoreBox">{String(pointsLabel)}</div>
        </div>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="pageWrap" style={{ background: "var(--ink)", minHeight: "100vh", padding: "18px 2vw" }}>
      <style>{`
        :root{
          --ink:#212A31;
          --ink2:#0B1B2B;
          --primary:#124E66;
          --muted:#748D92;
          --cloud:#D3D9D4;
          --danger:#8b2e2e;
          --gold:#f6c338;
        }
        .container{ margin:0 auto; width:min(1100px,92vw); }
        .card{
          background: var(--ink2);
          color: #fff;
          border: 1px solid rgba(0,0,0,0.15);
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        .head{ display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:10px; }
        .title{ color: var(--cloud); font-size: 1.4em; font-weight: 800; }

        .rows{ display:grid; gap:.9rem; margin-top:.2rem; }

        .scoreBox{
          background: var(--muted);
          color: #0b1419;
          border-radius: 12px;
          min-height: 2.4em;
          display:flex; align-items:center; justify-content:center;
          font-weight:800;
        }

        .panelGrid{ display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:1rem; margin-top: .6rem; }
        @media (max-width: 800px){ .panelGrid{ grid-template-columns: 1fr; } }

        .panel{
          background: rgba(33,42,49,0.45);
          border: 1px solid rgba(211,217,212,0.12);
          border-radius: 12px;
          padding: 1rem;
        }

        .input{
          width: 100%;
          background: var(--cloud);
          color: #0b1419;
          border: 1px solid var(--muted);
          border-radius: 10px;
          height: 2.6em;
          padding: 0 .9em;
          font-size: 1em;
        }
        .input::placeholder{ color: var(--muted); }

        .btn{
          border: 1px solid transparent;
          background: var(--primary);
          color: #fff;
          border-radius: 12px;
          height: 2.8em;
          padding: 0 1.1em;
          font-weight: 700;
          font-size: 1em;
        }
        .btn.pm{ font-size: 2.2em; line-height: 1; }
        .btn-danger{ background: var(--danger); }
        .btn-gold{ background: var(--muted); color: #0b1419; }

        .bestof{
          width: 10.5em;
          border-radius: 9999px;
          height: 2.4em;
          background: var(--cloud);
          color: #0b1419;
          border: 1px solid var(--muted);
          padding: 0 .9em;
          font-weight: 700;
        }

        .pill{
          border-radius: 9999px;
          height: 2.4em;
          padding: 0 1rem;
          font-weight: 800;
          display:inline-flex; align-items:center; gap:.5rem;
          border:1px solid rgba(255,255,255,.08);
          background: #2A2A2A;
          color: #fff;
          cursor: pointer;
        }
        .pill.on{
          background: var(--gold);
          color: #0b1419;
        }
      `}</style>

      <div className="container">
        <div className="card">
          {/* Header */}
          <div className="head">
            <div className="title">{externalCourtName || "Court"}</div>
            <div style={{ display:"flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
              <select
                aria-label="Best of"
                className="bestof"
                value={s.meta?.bestOf ?? 3}
                onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}
              >
                <option value={3}>Best of 3</option>
                <option value={5}>Best of 5</option>
              </select>

              <button
                type="button"
                onClick={toggleGolden}
                className={`pill ${s.meta?.golden ? "on" : ""}`}
                title="Golden Point on/off"
              >
                <span>●</span> Golden
              </button>
            </div>
          </div>

          {/* Score rows */}
          <div className="rows">
            {renderRow("p1")}
            {renderRow("p2")}
          </div>

          {/* Team panels */}
          <div className="panelGrid">
            {/* TEAM A */}
            <div className="panel">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                <div>
                  <label style={{ color:"var(--cloud)", display:"block", marginBottom:".35rem" }}>Player 1</label>
                  <input
                    className="input"
                    placeholder="Enter Name"
                    value={s.players["1a"].name}
                    onChange={(e) => updatePlayer("1a", "name", e.target.value)}
                  />
                  <select
                    className="input"
                    value={s.players["1a"].cc}
                    onChange={(e) => updatePlayer("1a", "cc", e.target.value)}
                    style={{ marginTop: ".5rem" }}
                  >
                    {COUNTRIES.map(([f, n]) => (
                      <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ color:"var(--cloud)", display:"block", marginBottom:".35rem" }}>Player 2</label>
                  <input
                    className="input"
                    placeholder="Enter Name"
                    value={s.players["1b"].name}
                    onChange={(e) => updatePlayer("1b", "name", e.target.value)}
                  />
                  <select
                    className="input"
                    value={s.players["1b"].cc}
                    onChange={(e) => updatePlayer("1b", "cc", e.target.value)}
                    style={{ marginTop: ".5rem" }}
                  >
                    {COUNTRIES.map(([f, n]) => (
                      <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem", marginTop: ".75rem" }}>
                <button className="btn pm" onClick={() => addPoint("p1", +1)}>+</button>
                <button className="btn pm" onClick={() => addPoint("p1", -1)}>−</button>
              </div>
            </div>

            {/* TEAM B */}
            <div className="panel">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                <div>
                  <label style={{ color:"var(--cloud)", display:"block", marginBottom:".35rem" }}>Player 3</label>
                  <input
                    className="input"
                    placeholder="Enter Name"
                    value={s.players["2a"].name}
                    onChange={(e) => updatePlayer("2a", "name", e.target.value)}
                  />
                  <select
                    className="input"
                    value={s.players["2a"].cc}
                    onChange={(e) => updatePlayer("2a", "cc", e.target.value)}
                    style={{ marginTop: ".5rem" }}
                  >
                    {COUNTRIES.map(([f, n]) => (
                      <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ color:"var(--cloud)", display:"block", marginBottom:".35rem" }}>Player 4</label>
                  <input
                    className="input"
                    placeholder="Enter Name"
                    value={s.players["2b"].name}
                    onChange={(e) => updatePlayer("2b", "name", e.target.value)}
                  />
                  <select
                    className="input"
                    value={s.players["2b"].cc}
                    onChange={(e) => updatePlayer("2b", "cc", e.target.value)}
                    style={{ marginTop: ".5rem" }}
                  >
                    {COUNTRIES.map(([f, n]) => (
                      <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem", marginTop: ".75rem" }}>
                <button className="btn pm" onClick={() => addPoint("p2", +1)}>+</button>
                <button className="btn pm" onClick={() => addPoint("p2", -1)}>−</button>
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div
            style={{
              display: "flex",
              gap: ".75rem",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              marginTop: ".9rem",
              width: "100%",
            }}
          >
            <button className="btn btn-danger" onClick={resetLastGame}>Reset Game</button>
            <button className="btn btn-gold" onClick={newMatch}>New Match</button>
            <button className="btn" onClick={toggleServer} title="Toggle server">Serve 🎾</button>
            <button className="btn" onClick={resetPoints} title="Reset only points">Reset Points</button>
          </div>
        </div>
      </div>
    </div>
  );
}

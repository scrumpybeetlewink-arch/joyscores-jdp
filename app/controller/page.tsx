"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

/* ---------------- Types ---------------- */
type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;

type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf; golden: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  server: Side | null;
  tiebreak?: boolean; // tolerated if present in DB (legacy)
  tb?: Record<Side, number>; // tolerated if present in DB (legacy)
  ts?: number;
};

/* ---------------- Firebase path (single court v1) ---------------- */
const COURT_PATH = "/courts/court1";
const META_NAME_PATH = "/courts/court1/meta/name";

/* ---------------- Countries ---------------- */
const COUNTRIES: Array<[flag: string, name: string]> = [
  ["🇲🇾", "Malaysia"],
  ["🇸🇬", "Singapore"],
  ["🇹🇭", "Thailand"],
  ["🇮🇩", "Indonesia"],
  ["🇵🇭", "Philippines"],
  ["🇻🇳", "Vietnam"],
  ["🇮🇳", "India"],
  ["🇯🇵", "Japan"],
  ["🇰🇷", "South Korea"],
  ["🇨🇳", "China"],
  ["🇺🇸", "United States"],
  ["🇨🇦", "Canada"],
  ["🇬🇧", "United Kingdom"],
  ["🇫🇷", "France"],
  ["🇩🇪", "Germany"],
  ["🇪🇸", "Spain"],
  ["🇮🇹", "Italy"],
  ["🇧🇷", "Brazil"],
  ["🇦🇷", "Argentina"],
  ["🇿🇦", "South Africa"],
  ["🏳️", "(None)"],
];

/* ---------------- Helpers ---------------- */
const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);
const flag = (cc: string) => cc || "🏳️";

/* ---------------- Defaults ---------------- */
const defaultState: ScoreState = {
  meta: { name: "Joy Court 1", bestOf: 3, golden: false },
  players: {
    "1a": { name: "", cc: "🇲🇾" },
    "1b": { name: "", cc: "🇲🇾" },
    "2a": { name: "", cc: "🇲🇾" },
    "2b": { name: "", cc: "🇲🇾" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  server: "p1",
  ts: undefined,
};

/* ---------------- Normalize defensive read ---------------- */
function normalize(v: any): ScoreState {
  const s = v ?? {};
  const safe: ScoreState = {
    meta: {
      name: String(s?.meta?.name ?? defaultState.meta.name),
      bestOf: (s?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
      golden: !!s?.meta?.golden,
    },
    players: {
      "1a": {
        name: String(s?.players?.["1a"]?.name ?? ""),
        cc: String(s?.players?.["1a"]?.cc ?? "🇲🇾"),
      },
      "1b": {
        name: String(s?.players?.["1b"]?.name ?? ""),
        cc: String(s?.players?.["1b"]?.cc ?? "🇲🇾"),
      },
      "2a": {
        name: String(s?.players?.["2a"]?.name ?? ""),
        cc: String(s?.players?.["2a"]?.cc ?? "🇲🇾"),
      },
      "2b": {
        name: String(s?.players?.["2b"]?.name ?? ""),
        cc: String(s?.players?.["2b"]?.cc ?? "🇲🇾"),
      },
    },
    points: {
      p1: (s?.points?.p1 ?? 0) as Point,
      p2: (s?.points?.p2 ?? 0) as Point,
    },
    games: {
      p1: Number.isFinite(s?.games?.p1) ? s.games.p1 : 0,
      p2: Number.isFinite(s?.games?.p2) ? s.games.p2 : 0,
    },
    sets: {
      p1: Array.isArray(s?.sets?.p1) ? s.sets.p1 : [],
      p2: Array.isArray(s?.sets?.p2) ? s.sets.p2 : [],
    },
    server: s?.server === "p1" || s?.server === "p2" ? s.server : "p1",
    ts: typeof s?.ts === "number" ? s.ts : undefined,
  };
  return safe;
}

/* =========================================================
 * Controller Page
 * =======================================================*/
export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [externalCourtName, setExternalCourtName] = useState<string>("");

  useEffect(() => {
    let unsubScore = () => {};
    let unsubName = () => {};
    (async () => {
      try {
        await ensureAnonLogin();
      } catch {}
      unsubScore = onValue(ref(db, COURT_PATH), (snap) => {
        const v = snap.val();
        setS(v ? normalize(v) : defaultState);
      });
      unsubName = onValue(ref(db, META_NAME_PATH), (snap) => {
        const v = snap.val();
        setExternalCourtName(typeof v === "string" ? v : "");
      });
    })();
    return () => {
      unsubScore?.();
      unsubName?.();
    };
  }, []);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  /* ---------- Golden logic helper ---------- */
  function goldenAddPoint(n: ScoreState, side: Side) {
    // Only applies if golden is enabled AND both at 40 (deuce).
    const a = n.points.p1;
    const b = n.points.p2;
    if (!(n.meta.golden && a === 40 && b === 40)) return false;

    // Next point wins game for the side.
    winGame(n, side);
    return true;
  }

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1;
    n.points = { p1: 0, p2: 0 };
    const gA = n.games.p1,
      gB = n.games.p2;
    const lead = Math.abs(gA - gB);

    // set done at 6 with 2 clear
    if ((gA >= 6 || gB >= 6) && lead >= 2) {
      n.sets.p1.push(gA);
      n.sets.p2.push(gB);
      n.games = { p1: 0, p2: 0 };
      // reset any legacy tb remnants silently
    }
  }

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();

    if (dir === 1) {
      // Golden point check (before normal ad/deuce)
      if (goldenAddPoint(n, side)) return commit(n);

      const opp: Side = side === "p1" ? "p2" : "p1";
      const ps = n.points[side],
        po = n.points[opp];

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

  // Reset Game: remove one game from the side currently leading
  function resetGame() {
    const n = clone();
    const { p1, p2 } = n.games;
    if (p1 > p2) n.games.p1 = Math.max(0, p1 - 1);
    else if (p2 > p1) n.games.p2 = Math.max(0, p2 - 1);
    commit(n);
  }

  function newMatch() {
    commit({
      ...defaultState,
      meta: {
        name: externalCourtName || defaultState.meta.name,
        bestOf: s.meta?.bestOf ?? 3,
        golden: !!s.meta?.golden,
      },
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

  async function resetPoints() {
    const n = clone();
    n.points = { p1: 0, p2: 0 };
    commit(n);
  }

  async function updatePlayer(
    key: "1a" | "1b" | "2a" | "2b",
    field: "name" | "cc",
    val: string
  ) {
    const n = clone();
    if (field === "name") {
      (n.players[key] as Player).name = val.slice(0, 30); // 30-char cap
    } else {
      (n.players[key] as Player).cc = val;
    }
    commit(n);
  }

  async function updateBestOf(v: BestOf) {
    const n = clone();
    n.meta.bestOf = v;
    commit(n);
  }

  async function toggleGolden() {
    const n = clone();
    n.meta.golden = !n.meta.golden;
    commit(n);
  }

  const maxSets = useMemo(
    () => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3),
    [s.meta?.bestOf]
  );

  /* ---------- Row renderer (unchanged spacing) ---------- */
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
      if (i < finishedCount)
        return side === "p1" ? sets.p1?.[i] ?? "" : sets.p2?.[i] ?? "";
      if (i === finishedCount)
        return side === "p1" ? games?.p1 ?? "" : games?.p2 ?? "";
      return "";
    });

    const points = s.points ?? defaultState.points;
    const pointsLabel = String(points[side] ?? 0);

    const scoreBoxStyle = {
      fontSize: "1em",
      background: "var(--c-muted)",
      color: "#0b1419",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "2.1em",
      padding: "0.1em 0",
      fontWeight: 700,
    } as const;

    return (
      <div
        className="row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 3.2em minmax(0,1fr)",
          gap: "0.75em",
          alignItems: "center",
          fontSize: "1.5em",
        }}
      >
        <div
          className="teamline"
          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {teamLine}
        </div>

        <div className="serveCol" style={{ display: "flex", justifyContent: "center" }}>
          {s.server === side && (
            <span aria-label="serving" title="Serving" style={{ fontSize: "1em", lineHeight: 1 }}>
              🎾
            </span>
          )}
        </div>

        <div
          className="scoreGrid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)`,
            gap: "0.6em",
          }}
        >
          {setCells.map((v, i) => (
            <div key={i} className="setBox" style={scoreBoxStyle}>
              {v}
            </div>
          ))}
          <div className="pointsBox" style={scoreBoxStyle}>
            {pointsLabel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pageWrap" style={{ background: "var(--c-ink)", minHeight: "100vh" }}>
      <style>{`
        :root{
          --c-ink:#212A31;
          --c-ink-2:#0B1B2B;
          --c-primary:#124E66;
          --c-muted:#748D92;
          --c-cloud:#D3D9D4;
          --c-accent:#0E4C5F;
        }
        .container { margin: 0 auto; }
        .cardRoot{ font-size: clamp(14px, 1vw + 12px, 20px); }
        .card{
          background: var(--c-ink-2);
          color: #fff;
          border: 1px solid rgba(0,0,0,0.15);
          border-radius: 16px;
          padding: 1.1rem 1.1rem 1.0rem;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        .headerBar{
          display:flex; gap:.9rem; padding:.5rem .5rem .8rem;
          border-bottom: 1px solid rgba(211,217,212,0.16);
          align-items: center; justify-content: space-between;
        }
        .courtName{ color: var(--c-cloud); font-size: 1.4em; font-weight: 800; }
        .hr{ height:1px; background: rgba(211,217,212,0.18); margin:1rem 0; }

        /* Panels — reverted to softer look */
        .teamsGrid{
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          align-items: stretch;
        }
        @media (max-width: 900px){
          .teamsGrid{ grid-template-columns: 1fr; }
        }
        .teamPanel{
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(211,217,212,0.12);
          border-radius: 12px;
          padding: 0.9rem;
        }
        .panelTitle{
          font-weight: 700; color: var(--c-cloud); margin-bottom: .5rem;
        }

        .input{
          width: 100%;
          background: #DCE3E7;
          border: 1px solid var(--c-muted);
          color: #0b1419;
          border-radius: 10px;
          height: 2.6em;
          padding: 0 .9em;
          font-size: 1em;
        }
        .input::placeholder{ color: #6f7b81; }
        .input:focus{ outline: 2px solid var(--c-primary); border-color: var(--c-primary); }

        .btn{
          border: 1px solid transparent;
          background: var(--c-primary);
          color: #fff;
          border-radius: 12px;
          height: 2.8em;
          padding: 0 1.1em;
          font-weight: 700;
          font-size: 1em;
          transition: transform .06s ease, filter .12s ease;
        }
        .btn:hover{ filter: brightness(1.05); transform: translateY(-1px); }
        .btn:active{ transform: translateY(0); }
        .btn-lg{ height: 2.6em; min-width: 9.5rem; }
        .btn-xl{ height: 3.2em; font-size: 1.05em; min-width: 9.5rem; }

        /* Big teal +/- pads (restored) */
        .pad{
          background: #0E4C5F;
          border: 1px solid rgba(255,255,255,0.08);
          color: #fff;
          border-radius: 14px;
          height: 4.5rem;
          font-weight: 900;
          font-size: 1.8rem;
          display:flex; align-items:center; justify-content:center;
        }

        .btn-danger{ background: #8b2e2e; }
        .btn-gold{ background: var(--c-muted); color: #0b1419; }

        .bestOfSelect{
          background: var(--c-cloud);
          color: #0b1419;
          border: 1px solid var(--c-muted);
          border-radius: 9999px;
          height: 2.2em; /* smaller pill */
          padding: 0 .9em;
          font-weight: 700;
        }
        .togglePill{
          display:inline-flex; align-items:center; gap:.5rem;
          border-radius:9999px; padding:.35rem .7rem;
          background: #2a5b6c; color:#fff; border:1px solid rgba(255,255,255,.08);
          font-weight:800;
        }
      `}</style>

      <div className="container" style={{ width: "min(1200px, 95vw)", paddingTop: 18, paddingBottom: 24 }}>
        <div className="card cardRoot">
          {/* Header */}
          <div className="headerBar">
            <div className="courtName">{externalCourtName || s.meta.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
              <select
                aria-label="Best of"
                className="bestOfSelect"
                value={s.meta.bestOf ?? 3}
                onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}
              >
                <option value={3}>Best of 3</option>
                <option value={5}>Best of 5</option>
              </select>

              <button onClick={toggleGolden} className="togglePill" title="Golden Point on/off">
                <span style={{
                  display:"inline-block",
                  width: 8, height: 8, borderRadius: 999,
                  background: s.meta.golden ? "#ffd24d" : "#7d8a90", boxShadow: s.meta.golden ? "0 0 6px #ffd24d" : "none"
                }} />
                Golden
              </button>
            </div>
          </div>

          {/* Score rows */}
          {renderRow("p1")}
          {renderRow("p2")}

          <div className="hr" />

          {/* Team panels — reverted visuals */}
          <div className="teamsGrid">
            {/* TEAM A - Left column */}
            <div className="teamPanel">
              <div className="panelTitle">Player 1</div>
              <input
                className="input"
                placeholder="Enter Name"
                value={s.players["1a"].name}
                onChange={(e) => updatePlayer("1a", "name", e.target.value)}
              />
              <div style={{ height: 10 }} />
              <select
                className="input"
                value={s.players["1a"].cc}
                onChange={(e) => updatePlayer("1a", "cc", e.target.value)}
              >
                {COUNTRIES.map(([f, n]) => (
                  <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                ))}
              </select>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <button className="pad" onClick={() => addPoint("p1", +1)}>+</button>
                <button className="pad" onClick={() => addPoint("p1", -1)}>−</button>
              </div>
            </div>

            <div className="teamPanel">
              <div className="panelTitle">Player 2</div>
              <input
                className="input"
                placeholder="Enter Name"
                value={s.players["1b"].name}
                onChange={(e) => updatePlayer("1b", "name", e.target.value)}
              />
              <div style={{ height: 10 }} />
              <select
                className="input"
                value={s.players["1b"].cc}
                onChange={(e) => updatePlayer("1b", "cc", e.target.value)}
              >
                {COUNTRIES.map(([f, n]) => (
                  <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                ))}
              </select>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <button className="pad" onClick={() => addPoint("p1", +1)}>+</button>
                <button className="pad" onClick={() => addPoint("p1", -1)}>−</button>
              </div>
            </div>

            {/* TEAM B - Right column */}
            <div className="teamPanel">
              <div className="panelTitle">Player 3</div>
              <input
                className="input"
                placeholder="Enter Name"
                value={s.players["2a"].name}
                onChange={(e) => updatePlayer("2a", "name", e.target.value)}
              />
              <div style={{ height: 10 }} />
              <select
                className="input"
                value={s.players["2a"].cc}
                onChange={(e) => updatePlayer("2a", "cc", e.target.value)}
              >
                {COUNTRIES.map(([f, n]) => (
                  <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                ))}
              </select>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <button className="pad" onClick={() => addPoint("p2", +1)}>+</button>
                <button className="pad" onClick={() => addPoint("p2", -1)}>−</button>
              </div>
            </div>

            <div className="teamPanel">
              <div className="panelTitle">Player 4</div>
              <input
                className="input"
                placeholder="Enter Name"
                value={s.players["2b"].name}
                onChange={(e) => updatePlayer("2b", "name", e.target.value)}
              />
              <div style={{ height: 10 }} />
              <select
                className="input"
                value={s.players["2b"].cc}
                onChange={(e) => updatePlayer("2b", "cc", e.target.value)}
              >
                {COUNTRIES.map(([f, n]) => (
                  <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                ))}
              </select>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <button className="pad" onClick={() => addPoint("p2", +1)}>+</button>
                <button className="pad" onClick={() => addPoint("p2", -1)}>−</button>
              </div>
            </div>
          </div>

          {/* Footer controls (consistent sizes; Reset Points = red) */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "0.9rem",
            }}
          >
            <button className="btn btn-danger btn-lg" onClick={resetGame}>Reset Game</button>
            <button className="btn btn-gold btn-lg" onClick={newMatch}>New Match</button>
            <button className="btn btn-lg" onClick={toggleServer} title="Toggle server">Serve🎾</button>
            <button className="btn btn-danger btn-lg" onClick={resetPoints}>Reset Points</button>
          </div>
        </div>
      </div>
    </div>
  );
}

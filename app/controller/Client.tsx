"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

/** ---------- Types ---------- */
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
const nextPoint = (p: Point, golden: boolean): Point =>
  golden
    ? (p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : 40)
    : (p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad");
const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

/** ---------- Defaults ---------- */
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

/** ---------- Normalize snapshot ---------- */
function normalize(v: any): ScoreState {
  const safe: ScoreState = {
    meta: {
      name: (v?.meta?.name ?? ""),
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

/** =========================================================
 *  Controller (client)
 *  =========================================================
 */
export default function ControllerClient() {
  const sp = useSearchParams();
  const court = (sp.get("court") || "court1").trim();
  const COURT_PATH = `/courts/${court}`;
  const META_NAME_PATH = `/courts/${court}/meta/name`;

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

    return () => {
      unsubScore?.();
      unsubName?.();
    };
  }, [COURT_PATH, META_NAME_PATH]);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
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

    const golden = !!n.meta?.golden;

    if (dir === 1) {
      const opp: Side = side === "p1" ? "p2" : "p1";
      const ps = n.points[side], po = n.points[opp];

      if (golden) {
        if (ps === 40 && po === 40) {
          winGame(n, side);
        } else {
          n.points[side] = nextPoint(ps, golden);
        }
      } else {
        if (ps === 40 && (po === 0 || po === 15 || po === 30)) winGame(n, side);
        else if (ps === 40 && po === "Ad") n.points[opp] = 40;
        else if (ps === 40 && po === 40) n.points[side] = "Ad";
        else if (ps === "Ad") winGame(n, side);
        else n.points[side] = nextPoint(ps, golden);
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

  function resetGameDecrement() {
    const n = clone();
    const { p1: g1, p2: g2 } = n.games;
    if (g1 > g2) n.games.p1 = Math.max(0, g1 - 1);
    else if (g2 > g1) n.games.p2 = Math.max(0, g2 - 1);
    n.points = { p1: 0, p2: 0 };
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

  function resetPoints() {
    const n = clone();
    n.points = { p1: 0, p2: 0 };
    commit(n);
  }

  async function updatePlayer(key: "1a"|"1b"|"2a"|"2b", field: "name"|"cc", val: string) {
    const n = clone();
    (n.players[key] as any)[field] = field === "name" ? val.slice(0, 30) : val;
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
    if (n.meta.golden && (n.points.p1 === "Ad" || n.points.p2 === "Ad")) {
      n.points = { p1: 40, p2: 40 };
    }
    await commit(n);
  }

  const maxSets = useMemo(() => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s.meta?.bestOf]);

  /** ---------- Row Renderer ---------- */
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

    const pointsLabel = s.tiebreak ? `TB ${(s.tb ?? defaultState.tb)[side]}` : (s.points ?? defaultState.points)[side];

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
            gap: "0.4em",
          }}
        >
          {setCells.map((v, i) => (
            <div key={i} className="setBox" style={scoreBoxStyle}>
              {v}
            </div>
          ))}
          <div className="pointsBox" style={scoreBoxStyle}>{String(pointsLabel)}</div>
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
        }
        .container { margin: 0 auto; }
        .cardRoot{ font-size: clamp(14px, 1vw + 12px, 20px); }
        .card{
          background: var(--c-ink-2);
          color: #fff;
          border: 1px solid rgba(0,0,0,0.15);
          border-radius: 16px;
          padding: 1rem;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        .headerBar{
          display:flex; gap:1rem; padding:.5rem .75rem .9rem;
          border-bottom: 1px solid rgba(211,217,212,0.16);
        }
        .stack{ display:flex; flex-direction:column; }
        .hr{ height:1px; background: rgba(211,217,212,0.18); margin:1rem 0; }

        .teamsGrid{
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          align-items: stretch;
        }
        @media (max-width: 800px){
          .teamsGrid{ grid-template-columns: 1fr; }
        }

        .teamCard{
          background: rgba(33,42,49,0.45);
          border: 1px solid rgba(211,217,212,0.12);
          border-radius: 12px;
          padding: 1rem;
          font-size: 1em;
        }

        .input{
          width: 100%;
          background: var(--c-cloud);
          border: 1px solid var(--c-muted);
          color: var(--c-ink);
          border-radius: 10px;
          height: 2.6em;
          padding: 0 .9em;
          font-size: 1em;
        }
        .input::placeholder{ color: var(--c-muted); }
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
        .btn-lg{ height: 2.8em; }
        .btn-xl{ height: 3.2em; font-size: 1.15em; }
        .btn.pm{ font-size: 2.3em; line-height: 1; }

        .btn-danger{ background: #8b2e2e; }
        .btn-gold{ background: var(--c-muted); color: #0b1419; }

        .pill{ border-radius: 9999px; }

        .courtName{ color: var(--c-cloud); font-size: 1.4em; font-weight: 700; }

        .bestOfSelect{
          background: var(--c-primary);
          color: #fff;
          border-color: transparent;
        }
        .bestOfSelect:focus{
          outline: 2px solid var(--c-primary);
          border-color: var(--c-primary);
        }
        .bestOfSelect option{
          color: #0b1419;
        }
      `}</style>

      <div className="container" style={{ width: "min(1200px, 95vw)", paddingTop: 18, paddingBottom: 24 }}>
        <div className="card cardRoot">
          {/* Header */}
          <div className="headerBar" style={{ justifyContent: "space-between", alignItems: "end" }}>
            <div className="courtName">{externalCourtName || (court.replace(/^court/i, "Court "))}</div>
            <div className="stack" style={{ alignItems: "end", gap: ".5rem" }}>
              <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-gold pill"
                  onClick={toggleGolden}
                  title="Toggle Golden Point"
                  style={{ height: "2.4em", padding: "0 1rem", fontWeight: 800 }}
                >
                  {s.meta?.golden ? "Golden Point: ON" : "Golden Point: OFF"}
                </button>

                <select
                  aria-label="Best of"
                  className="input bestOfSelect pill"
                  value={s.meta?.bestOf ?? 3}
                  onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}
                  style={{ width: "11em", height: "2.4em", padding: "0 .9em" }}
                >
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                </select>
              </div>
            </div>
          </div>

          {/* Score rows */}
          {renderRow("p1")}
          {renderRow("p2")}

          <div className="hr" />

          {/* Team panels */}
          <div className="teamsGrid">
            {/* TEAM A */}
            <div className="card teamCard">
              <div className="stack" style={{ gap: ".75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                  <div className="stack" style={{ gap: ".4rem" }}>
                    <label style={{ color: "var(--c-cloud)", fontSize: "1em" }}>Player 1</label>
                    <input
                      className="input"
                      placeholder="Enter Name"
                      value={s.players["1a"].name}
                      onChange={(e) => updatePlayer("1a", "name", e.target.value)}
                      maxLength={30}
                    />
                    <select
                      className="input"
                      value={s.players["1a"].cc}
                      onChange={(e) => updatePlayer("1a", "cc", e.target.value)}
                    >
                      {COUNTRIES.map(([f, n]) => (
                        <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                      ))}
                    </select>
                  </div>

                  <div className="stack" style={{ gap: ".4rem" }}>
                    <label style={{ color: "var(--c-cloud)", fontSize: "1em" }}>Player 2</label>
                    <input
                      className="input"
                      placeholder="Enter Name"
                      value={s.players["1b"].name}
                      onChange={(e) => updatePlayer("1b", "name", e.target.value)}
                      maxLength={30}
                    />
                    <select
                      className="input"
                      value={s.players["1b"].cc}
                      onChange={(e) => updatePlayer("1b", "cc", e.target.value)}
                    >
                      {COUNTRIES.map(([f, n]) => (
                        <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="teamsGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <button className="btn btn-xl pm" onClick={() => addPoint("p1", +1)}>+</button>
                  <button className="btn btn-xl pm" onClick={() => addPoint("p1", -1)}>−</button>
                </div>
              </div>
            </div>

            {/* TEAM B */}
            <div className="card teamCard">
              <div className="stack" style={{ gap: ".75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                  <div className="stack" style={{ gap: ".4rem" }}>
                    <label style={{ color: "var(--c-cloud)", fontSize: "1em" }}>Player 3</label>
                    <input
                      className="input"
                      placeholder="Enter Name"
                      value={s.players["2a"].name}
                      onChange={(e) => updatePlayer("2a", "name", e.target.value)}
                      maxLength={30}
                    />
                    <select
                      className="input"
                      value={s.players["2a"].cc}
                      onChange={(e) => updatePlayer("2a", "cc", e.target.value)}
                    >
                      {COUNTRIES.map(([f, n]) => (
                        <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                      ))}
                    </select>
                  </div>

                  <div className="stack" style={{ gap: ".4rem" }}>
                    <label style={{ color: "var(--c-cloud)", fontSize: "1em" }}>Player 4</label>
                    <input
                      className="input"
                      placeholder="Enter Name"
                      value={s.players["2b"].name}
                      onChange={(e) => updatePlayer("2b", "name", e.target.value)}
                      maxLength={30}
                    />
                    <select
                      className="input"
                      value={s.players["2b"].cc}
                      onChange={(e) => updatePlayer("2b", "cc", e.target.value)}
                    >
                      {COUNTRIES.map(([f, n]) => (
                        <option key={`${f}-${n}`} value={f}>{f} {n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="teamsGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <button className="btn btn-xl pm" onClick={() => addPoint("p2", +1)}>+</button>
                  <button className="btn btn-xl pm" onClick={() => addPoint("p2", -1)}>−</button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div
            className="footerControls"
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "0.75rem",
              width: "100%",
            }}
          >
            <button className="btn btn-danger btn-lg" onClick={resetGameDecrement}>Reset Game</button>
            <button className="btn btn-danger btn-lg" onClick={resetPoints}>Reset Points</button>
            <button className="btn btn-gold btn-lg" onClick={newMatch}>New Match</button>
            <button
              className="btn btn-lg"
              onClick={toggleServer}
              style={{ background: "var(--c-primary)", borderColor: "transparent", color: "white" }}
              title="Toggle server"
            >
              Serve🎾
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

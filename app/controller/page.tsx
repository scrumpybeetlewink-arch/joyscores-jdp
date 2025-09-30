"use client";

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

/** ---------- Fixed paths (single court) ---------- */
const COURT_PATH = "/courts/court1";
const META_NAME_PATH = "/courts/court1/meta/name";

/** ---------- Countries (flag + label) ---------- */
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

/** ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fallback: string) =>
  n?.trim() ? n : fallback;
const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

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
    meta: {
      name: typeof v?.meta?.name === "string" ? v.meta.name : "",
      bestOf: v?.meta?.bestOf === 5 ? 5 : 3,
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
 *  Controller Page (single-court, no dynamic routing)
 *  =========================================================
 */
export const dynamic = "force-static";

export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [externalName, setExternalName] = useState<string>("");
  const [golden, setGolden] = useState<boolean>(false);

  useEffect(() => {
    let unsubScore = () => {};
    let unsubName = () => {};

    (async () => {
      try {
        await ensureAnonLogin();
      } catch {}
      unsubScore = onValue(ref(db, COURT_PATH), (snap) => {
        setS(snap.exists() ? normalize(snap.val()) : defaultState);
      });
      unsubName = onValue(ref(db, META_NAME_PATH), (snap) => {
        setExternalName(typeof snap.val() === "string" ? snap.val() : "");
      });
    })();

    return () => {
      unsubScore?.();
      unsubName?.();
    };
  }, []);

  const title = externalName || "Centre Court";

  const maxSets = useMemo(
    () => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3),
    [s.meta?.bestOf]
  );

  const commit = async (next: ScoreState) => {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  };
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1;
    n.points = { p1: 0, p2: 0 };
    const gA = n.games.p1,
      gB = n.games.p2;
    const lead = Math.abs(gA - gB);

    if ((gA >= 6 || gB >= 6) && lead >= 2) {
      n.sets.p1.push(gA);
      n.sets.p2.push(gB);
      n.games = { p1: 0, p2: 0 };
      n.tiebreak = false;
      n.tb = { p1: 0, p2: 0 };
    } else if (gA === 6 && gB === 6) {
      n.tiebreak = true;
      n.tb = { p1: 0, p2: 0 };
    }
  }

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();

    // Tie-break points
    if (n.tiebreak) {
      n.tb[side] = Math.max(0, n.tb[side] + dir);
      const a = n.tb.p1,
        b = n.tb.p2;
      if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) {
        if (a > b) {
          n.sets.p1.push(n.games.p1 + 1);
          n.sets.p2.push(n.games.p2);
        } else {
          n.sets.p2.push(n.games.p2 + 1);
          n.sets.p1.push(n.games.p1);
        }
        n.games = { p1: 0, p2: 0 };
        n.points = { p1: 0, p2: 0 };
        n.tiebreak = false;
        n.tb = { p1: 0, p2: 0 };
      }
      return commit(n);
    }

    if (dir === 1) {
      const opp: Side = side === "p1" ? "p2" : "p1";
      const ps = n.points[side],
        po = n.points[opp];

      // Golden point: if both at 40, next point wins game
      if (golden && ps === 40 && po === 40) {
        winGame(n, side);
      } else if (ps === 40 && (po === 0 || po === 15 || po === 30)) {
        winGame(n, side);
      } else if (ps === 40 && po === "Ad") {
        n.points[opp] = 40;
      } else if (ps === 40 && po === 40) {
        n.points[side] = "Ad";
      } else if (ps === "Ad") {
        winGame(n, side);
      } else {
        n.points[side] = nextPoint(ps);
      }
    } else {
      n.points[side] = prevPoint(n.points[side]);
    }
    commit(n);
  }

  function resetPoints() {
    const n = clone();
    n.points = { p1: 0, p2: 0 };
    commit(n);
  }

  function resetGameByOne() {
    const n = clone();
    // Decrement the side currently ahead by one game (never below 0)
    const { p1, p2 } = n.games;
    if (p1 > p2) n.games.p1 = Math.max(0, p1 - 1);
    else if (p2 > p1) n.games.p2 = Math.max(0, p2 - 1);
    commit(n);
  }

  function newMatch() {
    commit({
      ...defaultState,
      meta: { name: externalName, bestOf: (s.meta?.bestOf ?? 3) as BestOf },
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

  async function updatePlayer(
    key: "1a" | "1b" | "2a" | "2b",
    field: "name" | "cc",
    val: string
  ) {
    const n = clone();
    (n.players[key] as any)[field] = val;
    await commit(n);
  }

  async function updateBestOf(v: BestOf) {
    const n = clone();
    n.meta.bestOf = v;
    await commit(n);
  }

  function toggleServer() {
    const n = clone();
    n.server = n.server === "p1" ? "p2" : "p1";
    commit(n);
  }

  /** ---------- Row renderer ---------- */
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
      if (i < finishedCount) return side === "p1" ? sets.p1?.[i] ?? "" : sets.p2?.[i] ?? "";
      if (i === finishedCount) return side === "p1" ? games?.p1 ?? "" : games?.p2 ?? "";
      return "";
    });

    const scoreBoxStyle = {
      fontSize: "1em",
      background: "var(--c-muted)",
      color: "#0b1419",
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "2.8em",
      padding: "0.1em 0",
      fontWeight: 800,
    } as const;

    const pointsLabel = s.tiebreak
      ? `TB ${(s.tb ?? defaultState.tb)[side]}`
      : (s.points ?? defaultState.points)[side];

    return (
      <div
        className="row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 3.2em minmax(0,1fr)",
          gap: "1rem",
          alignItems: "center",
          fontSize: "1.35em",
        }}
      >
        <div
          className="teamline"
          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {teamLine}
        </div>

        <div className="serveCol" style={{ textAlign: "center" }}>
          {s.server === side ? "🎾" : ""}
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
            <div key={i} className="scoreBox" style={scoreBoxStyle}>
              {v}
            </div>
          ))}
          <div className="scoreBox" style={scoreBoxStyle}>
            {String(pointsLabel)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ background: "var(--c-ink)", minHeight: "100vh", padding: "18px 2vw" }}>
      <style>{`
        :root{
          --c-ink:#212A31;
          --c-ink-2:#0B1B2B;
          --c-primary:#124E66;
          --c-muted:#748D92;
          --c-cloud:#D3D9D4;
        }
        .container{margin:0 auto; width:min(1100px,92vw);}
        .card{background:var(--c-ink-2); color:#fff; border:1px solid rgba(0,0,0,.15);
              border-radius:16px; padding:1.25rem; box-shadow:0 6px 20px rgba(0,0,0,.25);}
        .head{display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:10px;}
        .title{color:var(--c-cloud); font-size:1.6em; font-weight:800;}
        .select{width:12em; border-radius:9999px; height:2.4em; background:var(--c-cloud);
                color:#0b1419; border:1px solid var(--c-muted); padding:0 .9em; font-weight:700;}
        .row{display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.28em;}
        .panelGrid{display:grid; grid-template-columns: 1fr 1fr; gap:1.1rem;}
        .panel{background:rgba(33,42,49,.45); border:1px solid rgba(211,217,212,.12); border-radius:12px; padding:1rem;}
        .panel h4{margin:0 0 .5rem; color:var(--c-cloud); font-weight:800;}
        .input{width:100%; background:#dce3e6; color:#0b1419; border:1px solid var(--c-muted);
               border-radius:10px; height:2.6em; padding:0 .9em;}
        .input::placeholder{color:#6b7e86;}
        .country{width:100%; background:var(--c-cloud); border:1px solid var(--c-muted);
                 border-radius:10px; height:2.6em; padding:0 .9em;}
        .pmRow{display:grid; grid-template-columns: 1fr 1fr; gap:.8rem;}
        .pmTile{background:#0f4657; color:#fff; border-radius:12px; height:3.6em; display:flex;
                align-items:center; justify-content:center; font-weight:900; font-size:1.3em;}
        .pmTile.small{font-size:1.1em;}
        .hr{height:1px; background:rgba(211,217,212,.18); margin:1rem 0;}
        .footer{display:flex; gap:.75rem; flex-wrap:wrap; justify-content:center; margin-top:.75rem;}
        .btn{border:1px solid transparent; border-radius:12px; padding:0 1.1em; font-weight:800;}
        .btn-lg{height:3.2em; font-size:1.02em;}
        .btn-primary{background:var(--c-primary); color:#fff;}
        .btn-danger{background:#a23b3b; color:#fff;}
        .btn-neutral{background:#6e8289; color:#0b1419;}
        .toggle{background:#1c3846; color:#fff; border:1px solid rgba(255,255,255,.12);
                border-radius:9999px; padding:.35rem .7rem; display:inline-flex; align-items:center; gap:.5rem;}
        .toggleDot{width:.55rem; height:.55rem; border-radius:999px; background:${golden ? "#ffd166" : "#4b5b63"};}
      `}</style>

      <div className="container">
        <div className="card">
          {/* Header */}
          <div className="head">
            <div className="title">{title}</div>
            <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
              <select
                aria-label="Best of"
                className="select"
                value={s.meta?.bestOf ?? 3}
                onChange={(e) => updateBestOf((Number(e.target.value) as BestOf) || 3)}
              >
                <option value={3}>Best of 3</option>
                <option value={5}>Best of 5</option>
              </select>

              <button
                className="toggle"
                onClick={() => setGolden((g) => !g)}
                title="Golden Point on/off"
              >
                <span className="toggleDot" />
                Golden
              </button>
            </div>
          </div>

          {/* Score rows */}
          {renderRow("p1")}
          {renderRow("p2")}

          <div className="hr" />

          {/* Player panels 2×2 */}
          <div className="panelGrid">
            {/* P1 */}
            <div className="panel">
              <h4>Player 1</h4>
              <div style={{ display: "grid", gap: ".6rem" }}>
                <input
                  maxLength={30}
                  className="input"
                  placeholder="Enter Name"
                  value={s.players["1a"].name}
                  onChange={(e) => updatePlayer("1a", "name", e.target.value)}
                />
                <select
                  className="country"
                  value={s.players["1a"].cc}
                  onChange={(e) => updatePlayer("1a", "cc", e.target.value)}
                >
                  {COUNTRIES.map(([f, n]) => (
                    <option key={`${f}-${n}`} value={f}>
                      {f} {n}
                    </option>
                  ))}
                </select>
                <div className="pmRow">
                  <div className="pmTile" onClick={() => addPoint("p1", +1)}>
                    +
                  </div>
                  <div className="pmTile" onClick={() => addPoint("p1", -1)}>
                    −
                  </div>
                </div>
              </div>
            </div>

            {/* P2 */}
            <div className="panel">
              <h4>Player 2</h4>
              <div style={{ display: "grid", gap: ".6rem" }}>
                <input
                  maxLength={30}
                  className="input"
                  placeholder="Enter Name"
                  value={s.players["1b"].name}
                  onChange={(e) => updatePlayer("1b", "name", e.target.value)}
                />
                <select
                  className="country"
                  value={s.players["1b"].cc}
                  onChange={(e) => updatePlayer("1b", "cc", e.target.value)}
                >
                  {COUNTRIES.map(([f, n]) => (
                    <option key={`${f}-${n}`} value={f}>
                      {f} {n}
                    </option>
                  ))}
                </select>
                <div className="pmRow">
                  <div className="pmTile" onClick={() => addPoint("p1", +1)}>
                    +
                  </div>
                  <div className="pmTile" onClick={() => addPoint("p1", -1)}>
                    −
                  </div>
                </div>
              </div>
            </div>

            {/* P3 */}
            <div className="panel">
              <h4>Player 3</h4>
              <div style={{ display: "grid", gap: ".6rem" }}>
                <input
                  maxLength={30}
                  className="input"
                  placeholder="Enter Name"
                  value={s.players["2a"].name}
                  onChange={(e) => updatePlayer("2a", "name", e.target.value)}
                />
                <select
                  className="country"
                  value={s.players["2a"].cc}
                  onChange={(e) => updatePlayer("2a", "cc", e.target.value)}
                >
                  {COUNTRIES.map(([f, n]) => (
                    <option key={`${f}-${n}`} value={f}>
                      {f} {n}
                    </option>
                  ))}
                </select>
                <div className="pmRow">
                  <div className="pmTile" onClick={() => addPoint("p2", +1)}>
                    +
                  </div>
                  <div className="pmTile" onClick={() => addPoint("p2", -1)}>
                    −
                  </div>
                </div>
              </div>
            </div>

            {/* P4 */}
            <div className="panel">
              <h4>Player 4</h4>
              <div style={{ display: "grid", gap: ".6rem" }}>
                <input
                  maxLength={30}
                  className="input"
                  placeholder="Enter Name"
                  value={s.players["2b"].name}
                  onChange={(e) => updatePlayer("2b", "name", e.target.value)}
                />
                <select
                  className="country"
                  value={s.players["2b"].cc}
                  onChange={(e) => updatePlayer("2b", "cc", e.target.value)}
                >
                  {COUNTRIES.map(([f, n]) => (
                    <option key={`${f}-${n}`} value={f}>
                      {f} {n}
                    </option>
                  ))}
                </select>
                <div className="pmRow">
                  <div className="pmTile" onClick={() => addPoint("p2", +1)}>
                    +
                  </div>
                  <div className="pmTile" onClick={() => addPoint("p2", -1)}>
                    −
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="footer">
            <button className="btn btn-danger btn-lg" onClick={resetGameByOne}>
              Reset Game
            </button>
            <button className="btn btn-neutral btn-lg" onClick={newMatch}>
              New Match
            </button>
            <button className="btn btn-primary btn-lg" onClick={toggleServer} title="Toggle server">
              Serve 🎾
            </button>
            <button className="btn btn-danger btn-lg" onClick={resetPoints}>
              Reset Points
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

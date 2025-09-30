"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

/** ---------- Types ---------- */
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
  server: Side;
};

/** ---------- Defaults ---------- */
const defaultState: ScoreState = {
  meta: { name: "Joy Court 1", bestOf: 3, golden: false },
  players: {
    "1a": { name: "", cc: "MY" },
    "1b": { name: "", cc: "MY" },
    "2a": { name: "", cc: "MY" },
    "2b": { name: "", cc: "MY" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  server: "p1",
};

/** ---------- Normalize any RTDB snapshot into a complete ScoreState ---------- */
function normalize(v: any): ScoreState {
  const safe: ScoreState = {
    meta: {
      name: typeof v?.meta?.name === "string" ? v.meta.name : "Joy Court 1",
      bestOf: v?.meta?.bestOf === 5 ? 5 : 3,
      golden: !!v?.meta?.golden,
    },
    players: {
      "1a": {
        name: typeof v?.players?.["1a"]?.name === "string" ? v.players["1a"].name : "",
        cc: typeof v?.players?.["1a"]?.cc === "string" ? v.players["1a"].cc : "MY",
      },
      "1b": {
        name: typeof v?.players?.["1b"]?.name === "string" ? v.players["1b"].name : "",
        cc: typeof v?.players?.["1b"]?.cc === "string" ? v.players["1b"].cc : "MY",
      },
      "2a": {
        name: typeof v?.players?.["2a"]?.name === "string" ? v.players["2a"].name : "",
        cc: typeof v?.players?.["2a"]?.cc === "string" ? v.players["2a"].cc : "MY",
      },
      "2b": {
        name: typeof v?.players?.["2b"]?.name === "string" ? v.players["2b"].name : "",
        cc: typeof v?.players?.["2b"]?.cc === "string" ? v.players["2b"].cc : "MY",
      },
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
    server: v?.server === "p2" ? "p2" : "p1",
  };
  return safe;
}

/** ---------- Page ---------- */
export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const COURT_PATH = "courts/court1";

  // Subscribe to Firebase with normalization
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        await ensureAnonLogin();
      } catch {}
      const r = ref(db, COURT_PATH);
      unsub = onValue(r, (snap) => {
        const val = snap.val();
        setS(val ? normalize(val) : defaultState);
      });
    })();
    return () => unsub();
  }, []);

  /** Commit helper always writes a complete state object */
  const commit = (next: ScoreState) => set(ref(db, COURT_PATH), next);

  /** Clone helper */
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  /** --- Actions --- */
  const resetPoints = () => {
    const n = clone();
    n.points = { p1: 0, p2: 0 };
    commit(n);
  };

  // Per your request: Reset Game increments one game for the leading side (you can adjust)
  const resetGame = () => {
    const n = clone();
    // Example logic: decrement last game OR increment p1 by one (your earlier requirement was "increment by 1 per click")
    n.games.p1 = (n.games?.p1 ?? 0) + 1;
    n.points = { p1: 0, p2: 0 };
    commit(normalize(n)); // normalize before write for safety
  };

  const newMatch = () => {
    commit({ ...defaultState, meta: { ...defaultState.meta, name: s.meta.name } });
  };

  const toggleServer = () => {
    const n = clone();
    n.server = n.server === "p1" ? "p2" : "p1";
    commit(n);
  };

  const toggleGolden = () => {
    const n = clone();
    n.meta.golden = !n.meta.golden;
    commit(n);
  };

  const setBestOf = (v: BestOf) => {
    const n = clone();
    n.meta.bestOf = v;
    commit(n);
  };

  const setPlayerName = (key: "1a" | "1b" | "2a" | "2b", name: string) => {
    const n = clone();
    n.players[key].name = name.slice(0, 30); // cap at 30 chars
    commit(n);
  };

  const setPlayerCC = (key: "1a" | "1b" | "2a" | "2b", cc: string) => {
    const n = clone();
    n.players[key].cc = cc;
    commit(n);
  };

  const addPoint = (side: Side, delta: 1 | -1) => {
    const n = clone();
    const cur = (n.points?.[side] ?? 0) as number;
    const next = Math.max(0, cur + delta);
    n.points[side] = (next as unknown) as Point; // display-only simple ladder for controller
    commit(n);
  };

  const setBox = (val: any) =>
    typeof val === "number" && Number.isFinite(val) ? val : 0;

  /** --- UI --- */
  return (
    <main className="wrap">
      <style>{`
        :root{
          --ink:#212A31; --ink2:#0B1B2B; --primary:#124E66; --muted:#748D92; --cloud:#D3D9D4;
        }
        .wrap{ min-height:100vh; background:var(--ink); display:flex; align-items:center; justify-content:center; padding:2vh 2vw; }
        .card{ width:min(1100px,95vw); background:var(--ink2); color:#fff; border-radius:16px; box-shadow:0 6px 20px rgba(0,0,0,.25); padding:1rem 1.25rem; }
        .head{ display:flex; justify-content:space-between; align-items:center; gap:.75rem; padding-bottom:.8rem; border-bottom:1px solid rgba(211,217,212,.16); }
        .title{ font-size:1.6em; font-weight:800; color:var(--cloud); }
        .select{ width:11rem; height:2.2rem; border-radius:9999px; background:#0f3642; color:#fff; border:1px solid rgba(255,255,255,.12); padding:0 .8rem; font-weight:700; }
        .btn{ border:1px solid transparent; border-radius:12px; padding:0 1.1em; font-weight:700; }
        .btn-lg{ height:3rem; }
        .btn-primary{ background:#0f4e66; color:#fff; }
        .btn-secondary{ background:#6C8086; color:#0b1419; }
        .btn-danger{ background:#b54040; color:#fff; }
        .btn-gold{ background:#d6b44f; color:#0b1419; }
        .btn-pill{ border-radius:9999px; height:2.2rem; padding:0 .85rem; font-weight:800; }
        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.28em; margin-top:.8rem; }
        .teamline{ color:var(--cloud); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .grid{ display:grid; gap:.6rem; grid-template-columns: repeat(4,1fr); }
        .box{ background:var(--muted); color:#0b1419; border-radius:12px; min-height:2.4em; display:flex; align-items:center; justify-content:center; font-weight:800; }
        .panelGrid{ display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:1rem; margin-top:1rem; }
        .panel{ background:rgba(33,42,49,.45); border:1px solid rgba(211,217,212,.12); border-radius:12px; padding:1rem; }
        .input{ width:100%; background:#d9e0e4; color:#0b1419; border:1px solid var(--muted); border-radius:10px; height:2.6em; padding:0 .9em; }
        .footer{ display:flex; justify-content:center; gap:.75rem; margin-top:1rem; }
      `}</style>

      <section className="card">
        {/* Header */}
        <div className="head">
          <div className="title">{s.meta?.name || "Court"}</div>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            <select
              className="select"
              value={s.meta?.bestOf ?? 3}
              onChange={(e) => setBestOf((Number(e.target.value) as BestOf) || 3)}
            >
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
            <button
              className={`btn btn-pill ${s.meta?.golden ? "btn-gold" : "btn-secondary"}`}
              onClick={toggleGolden}
              title="Golden point on/off"
            >
              ● Golden
            </button>
          </div>
        </div>

        {/* Score rows */}
        <div className="row">
          <div className="teamline">
            🇲🇾 {s.players?.["1a"]?.name || "Player 1"} / 🇲🇾 {s.players?.["1b"]?.name || "Player 2"}
          </div>
          <div className="serve">{s.server === "p1" ? "🎾" : ""}</div>
          <div className="grid">
            <div className="box">{setBox(s.games?.p1)}</div>
            <div className="box">{String(s.points?.p1 ?? 0)}</div>
            <div className="box"></div>
            <div className="box">{setBox((s.sets?.p1 || [])[ (s.sets?.p1?.length || 1) - 1 ])}</div>
          </div>
        </div>

        <div className="row">
          <div className="teamline">
            🇲🇾 {s.players?.["2a"]?.name || "Player 3"} / 🇲🇾 {s.players?.["2b"]?.name || "Player 4"}
          </div>
          <div className="serve">{s.server === "p2" ? "🎾" : ""}</div>
          <div className="grid">
            <div className="box">{setBox(s.games?.p2)}</div>
            <div className="box">{String(s.points?.p2 ?? 0)}</div>
            <div className="box"></div>
            <div className="box">{setBox((s.sets?.p2 || [])[ (s.sets?.p2?.length || 1) - 1 ])}</div>
          </div>
        </div>

        {/* Player panels */}
        <div className="panelGrid">
          {(["1a", "1b", "2a", "2b"] as const).map((id, idx) => (
            <div key={id} className="panel">
              <div style={{ marginBottom: ".4rem", fontWeight: 700 }}>Player {idx + 1}</div>
              <input
                className="input"
                placeholder="Enter Name"
                maxLength={30}
                value={s.players?.[id]?.name ?? ""}
                onChange={(e) => setPlayerName(id, e.target.value)}
                style={{ marginBottom: ".5rem" }}
              />
              <select
                className="input"
                value={s.players?.[id]?.cc ?? "MY"}
                onChange={(e) => setPlayerCC(id, e.target.value)}
              >
                <option value="MY">🇲🇾 Malaysia</option>
                <option value="US">🇺🇸 USA</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="JP">🇯🇵 Japan</option>
                <option value="KR">🇰🇷 South Korea</option>
                <option value="CN">🇨🇳 China</option>
              </select>
              <div className="footer" style={{ justifyContent: "stretch" }}>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => addPoint(id.startsWith("1") ? "p1" : "p2", +1)}>+</button>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => addPoint(id.startsWith("1") ? "p1" : "p2", -1)}>−</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer buttons */}
        <div className="footer">
          <button className="btn btn-danger btn-lg" onClick={resetGame}>Reset Game</button>
          <button className="btn btn-secondary btn-lg" onClick={newMatch}>New Match</button>
          <button className="btn btn-primary btn-lg" onClick={toggleServer}>Serve 🎾</button>
          <button className="btn btn-danger btn-lg" onClick={resetPoints}>Reset Points</button>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";
import { COUNTRIES } from "@/lib/countries"; // ← use your existing countries source

type Sets = { p1: (string | number)[]; p2: (string | number)[] };
type PlayersState = Record<string, { cc: string }>;

const DEFAULT_PLAYERS: PlayersState = {
  "1a": { cc: "MY" },
  "1b": { cc: "MY" },
  "2a": { cc: "MY" },
  "2b": { cc: "MY" },
};

const COURT_DEFAULT_NAME = "Court";

export default function ControllerPage() {
  // ----- get ?court= from URL (client only; avoids Suspense export error)
  const [court, setCourt] = useState<string>("court1");
  useEffect(() => {
    const s = new URLSearchParams(window.location.search);
    setCourt(s.get("court") || "court1");
  }, []);

  // ----- UI state
  const [courtName, setCourtName] = useState(COURT_DEFAULT_NAME);
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  const [golden, setGolden] = useState<boolean>(false);

  const [players, setPlayers] = useState<PlayersState>(DEFAULT_PLAYERS);
  const [p1a, setP1a] = useState(""); // Player 1 name
  const [p1b, setP1b] = useState(""); // Player 2 name
  const [p2a, setP2a] = useState(""); // Player 3 name
  const [p2b, setP2b] = useState(""); // Player 4 name

  const [points, setPoints] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [sets, setSets] = useState<Sets>({ p1: [], p2: [] });
  const [serve, setServe] = useState<"p1" | "p2">("p1");

  const base = useMemo(() => `/courts/${court}`, [court]);

  useEffect(() => {
    ensureAnonLogin().catch(() => {});
  }, []);

  // ----- Firebase bindings
  useEffect(() => {
    if (!court) return;

    const offName = onValue(ref(db, `${base}/name`), (s) => {
      const v = s.val();
      setCourtName(typeof v === "string" && v.trim() ? v : COURT_DEFAULT_NAME);
    });

    const offCfg = onValue(ref(db, `${base}/config`), (s) => {
      const v = s.val() || {};
      setBestOf(v.bestOf === 5 ? 5 : 3);
      setGolden(!!v.golden);
    });

    const offPlayers = onValue(ref(db, `${base}/players`), (s) => {
      const v = s.val() as PlayersState | null;
      setPlayers(v || DEFAULT_PLAYERS);
    });

    const offNames = onValue(ref(db, `${base}/names`), (s) => {
      const v = s.val() || {};
      setP1a(v.p1a || "");
      setP1b(v.p1b || "");
      setP2a(v.p2a || "");
      setP2b(v.p2b || "");
    });

    const offScore = onValue(ref(db, `${base}/score`), (s) => {
      const v = s.val() || {};
      setPoints({ p1: v.p1 ?? 0, p2: v.p2 ?? 0 });
      setSets({
        p1: Array.isArray(v.sets?.p1) ? v.sets.p1 : [],
        p2: Array.isArray(v.sets?.p2) ? v.sets.p2 : [],
      });
      setServe(v.serve === "p2" ? "p2" : "p1");
    });

    return () => {
      offName();
      offCfg();
      offPlayers();
      offNames();
      offScore();
    };
  }, [base, court]);

  // ----- writers
  const write = (path: string, value: any) => set(ref(db, path), value);

  const saveNames = (patch: Partial<{ p1a: string; p1b: string; p2a: string; p2b: string }>) => {
    write(`${base}/names`, { p1a, p1b, p2a, p2b, ...patch });
  };

  const updateCountry = (key: "1a" | "1b" | "2a" | "2b", cc: string) => {
    const next = { ...(players || DEFAULT_PLAYERS), [key]: { cc } };
    setPlayers(next);
    write(`${base}/players`, next);
  };

  const saveConfig = (patch: Partial<{ bestOf: 3 | 5; golden: boolean }>) => {
    const cfg = { bestOf, golden, ...patch };
    setBestOf(cfg.bestOf);
    setGolden(cfg.golden);
    write(`${base}/config`, cfg);
  };

  const bump = (side: "p1" | "p2", op: "+" | "-") => {
    const cur = points[side] || 0;
    const nextVal = Math.max(0, op === "+" ? cur + 1 : cur - 1);
    const next = { ...points, [side]: nextVal };
    setPoints(next);
    write(`${base}/score`, { p1: next.p1, p2: next.p2, sets, serve });
  };

  const toggleServe = () => {
    const next = serve === "p1" ? "p2" : "p1";
    setServe(next);
    write(`${base}/score`, { p1: points.p1, p2: points.p2, sets, serve: next });
  };

  const resetPoints = () => {
    setPoints({ p1: 0, p2: 0 });
    write(`${base}/score`, { p1: 0, p2: 0, sets, serve });
  };

  // “Reset Game” = add one game to the side with higher points, then clear points
  const resetGame = () => {
    let sp1 = [...sets.p1];
    let sp2 = [...sets.p2];
    if ((points.p1 || 0) > (points.p2 || 0)) sp1.push((Number(sp1.at(-1)) || 0) + 1);
    else if ((points.p2 || 0) > (points.p1 || 0)) sp2.push((Number(sp2.at(-1)) || 0) + 1);

    const max = bestOf === 5 ? 5 : 3;
    sp1 = sp1.slice(0, max);
    sp2 = sp2.slice(0, max);

    const nxtSets: Sets = { p1: sp1, p2: sp2 };
    setSets(nxtSets);
    setPoints({ p1: 0, p2: 0 });
    write(`${base}/score`, { p1: 0, p2: 0, sets: nxtSets, serve });
  };

  const newMatch = () => {
    const zero: Sets = { p1: [], p2: [] };
    setSets(zero);
    setPoints({ p1: 0, p2: 0 });
    write(`${base}/score`, { p1: 0, p2: 0, sets: zero, serve: "p1" });
  };

  // ----- UI helpers (unchanged look)
  const countryFlag = (cc?: string) => COUNTRIES.find((c) => c.code === cc)?.flag ?? "🏳️";
  const teamLine = (a: string, b: string, aCC: string, bCC: string) =>
    `${countryFlag(aCC)} ${a || "Player 1"} / ${countryFlag(bCC)} ${b || "Player 2"}`;

  const setCells = (side: "p1" | "p2") => {
    const arr = sets[side] || [];
    const max = bestOf === 5 ? 5 : 3;
    return Array.from({ length: max }, (_, i) => arr[i] ?? "");
  };

  return (
    <main className="wrap">
      <section className="card">
        {/* Header */}
        <div className="head">
          <div className="title">{courtName}</div>
          <div className="controls">
            <button
              className={`pill ${golden ? "on" : ""}`}
              onClick={() => saveConfig({ golden: !golden })}
            >
              <span className="dot" /> Golden
            </button>
            <select
              className="select"
              value={bestOf}
              onChange={(e) => saveConfig({ bestOf: Number(e.target.value) === 5 ? 5 : 3 })}
            >
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>
        </div>

        {/* Score rows */}
        <div className="rows">
          <div className="row">
            <div className="teamline">
              {teamLine(p1a, p1b, players["1a"]?.cc || "MY", players["1b"]?.cc || "MY")}
            </div>
            <div className="serve">🎾</div>
            <div className="grid">
              <div className="box">{points.p1}</div>
              {setCells("p1").map((v, i) => (
                <div className="box" key={`p1_${i}`}>{v as any}</div>
              ))}
            </div>
          </div>

          <div className="row">
            <div className="teamline">
              {teamLine(p2a, p2b, players["2a"]?.cc || "MY", players["2b"]?.cc || "MY")}
            </div>
            <div className="serve" />
            <div className="grid">
              <div className="box">{points.p2}</div>
              {setCells("p2").map((v, i) => (
                <div className="box" key={`p2_${i}`}>{v as any}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Player panels – EXACT approved layout */}
        <div className="panelGrid">
          {/* P1 */}
          <section className="panel">
            <div className="panelTitle">Player 1</div>
            <input
              className="input"
              placeholder="Enter Name"
              value={p1a}
              maxLength={30}
              onChange={(e) => {
                setP1a(e.target.value);
                saveNames({ p1a: e.target.value });
              }}
            />
            <select
              className="input"
              value={players["1a"]?.cc || "MY"}
              onChange={(e) => updateCountry("1a", e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>

            <div className="btnRow">
              <button className="btnBig" onClick={() => bump("p1", "+")}>+</button>
              <button className="btnBig" onClick={() => bump("p1", "-")}>−</button>
            </div>
          </section>

          {/* P2 */}
          <section className="panel">
            <div className="panelTitle">Player 2</div>
            <input
              className="input"
              placeholder="Enter Name"
              value={p1b}
              maxLength={30}
              onChange={(e) => {
                setP1b(e.target.value);
                saveNames({ p1b: e.target.value });
              }}
            />
            <select
              className="input"
              value={players["1b"]?.cc || "MY"}
              onChange={(e) => updateCountry("1b", e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>

            <div className="btnRow">
              <button className="btnBig" onClick={() => bump("p2", "+")}>+</button>
              <button className="btnBig" onClick={() => bump("p2", "-")}>−</button>
            </div>
          </section>

          {/* P3 */}
          <section className="panel">
            <div className="panelTitle">Player 3</div>
            <input
              className="input"
              placeholder="Enter Name"
              value={p2a}
              maxLength={30}
              onChange={(e) => {
                setP2a(e.target.value);
                saveNames({ p2a: e.target.value });
              }}
            />
            <select
              className="input"
              value={players["2a"]?.cc || "MY"}
              onChange={(e) => updateCountry("2a", e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>

            <div className="btnRow">
              <button className="btnBig" onClick={() => bump("p2", "+")}>+</button>
              <button className="btnBig" onClick={() => bump("p2", "-")}>−</button>
            </div>
          </section>

          {/* P4 */}
          <section className="panel">
            <div className="panelTitle">Player 4</div>
            <input
              className="input"
              placeholder="Enter Name"
              value={p2b}
              maxLength={30}
              onChange={(e) => {
                setP2b(e.target.value);
                saveNames({ p2b: e.target.value });
              }}
            />
            <select
              className="input"
              value={players["2b"]?.cc || "MY"}
              onChange={(e) => updateCountry("2b", e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>

            <div className="btnRow">
              <button className="btnBig" onClick={() => bump("p2", "+")}>+</button>
              <button className="btnBig" onClick={() => bump("p2", "-")}>−</button>
            </div>
          </section>
        </div>

        {/* Footer controls – sizes & colors consistent */}
        <div className="footerBtns">
          <button className="btnDanger btnLg" onClick={resetGame}>Reset Game</button>
          <button className="btnMuted btnLg" onClick={newMatch}>New Match</button>
          <button className="btnPrimary btnLg" onClick={toggleServe}>
            Serve <span aria-hidden>🎾</span>
          </button>
          <button className="btnDanger btnLg" onClick={resetPoints}>Reset Points</button>
        </div>
      </section>

      <style jsx>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --muted:#748D92; --cloud:#D3D9D4; --teal:#124E66; }
        .wrap{ background:var(--ink); min-height:100vh; padding:18px 2vw; }
        .card{ margin:0 auto; width:min(1100px,92vw); background:var(--ink2); color:#fff; border:1px solid rgba(0,0,0,.15); border-radius:16px; padding:1.25rem; box-shadow:0 6px 20px rgba(0,0,0,.25); }
        .head{ display:flex; justify-content:space-between; align-items:center; gap:1rem; }
        .title{ color:var(--cloud); font-weight:800; font-size:1.8rem; }
        .controls{ display:flex; gap:.6rem; align-items:center; }
        .pill{ height:2.1rem; padding:0 .9rem; border-radius:999px; border:1px solid rgba(255,255,255,.12); background:#26414B; color:#fff; font-weight:700; }
        .pill.on{ background:#2C6C3B; }
        .pill .dot{ display:inline-block; width:.5rem; height:.5rem; border-radius:50%; background:#fff; margin-right:.5rem; }
        .select{ height:2.1rem; border-radius:999px; padding:0 .8rem; border:1px solid rgba(255,255,255,.12); background:var(--cloud); color:#0b1419; font-weight:700; }

        .rows{ display:grid; gap:.9rem; margin-top:.9rem; }
        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.2rem; }
        .teamline{ color:var(--cloud); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; }
        .box{ background:var(--muted); color:#0b1419; border-radius:12px; min-height:2.6em; display:flex; align-items:center; justify-content:center; font-weight:800; }

        .panelGrid{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:1rem; margin-top:1rem; }
        .panel{ background:rgba(33,42,49,.45); border:1px solid rgba(211,217,212,.12); border-radius:12px; padding:1rem; }
        .panelTitle{ font-weight:800; color:var(--cloud); margin-bottom:.4rem; }
        .input{ width:100%; background:#D3D9D4; color:#0b1419; border:1px solid var(--muted); border-radius:10px; height:2.6em; padding:0 .9em; margin:.4rem 0; }
        .btnRow{ display:grid; grid-template-columns:1fr 1fr; gap:.8rem; margin-top:.4rem; }
        .btnBig{ background:#0F4253; border:1px solid rgba(255,255,255,.08); color:#fff; height:64px; border-radius:12px; font-weight:900; font-size:1.6rem; }

        .footerBtns{ display:flex; gap:.8rem; justify-content:flex-start; align-items:center; margin-top:1rem; }
        .btnLg{ height:44px; padding:0 1rem; border-radius:12px; font-weight:800; border:1px solid rgba(255,255,255,.08); }
        .btnDanger{ background:#7e1f21; }
        .btnMuted{ background:#6c7b7f; color:#0b1419; }
        .btnPrimary{ background:#124E66; }
      `}</style>
    </main>
  );
}

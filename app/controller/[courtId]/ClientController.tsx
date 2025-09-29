// app/controller/[courtId]/ClientController.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

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

const COUNTRIES: Array<[flag: string, name: string]> = [
  ["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇹🇭","Thailand"],["🇮🇩","Indonesia"],["🇵🇭","Philippines"],
  ["🇻🇳","Vietnam"],["🇮🇳","India"],["🇯🇵","Japan"],["🇰🇷","South Korea"],["🇨🇳","China"],
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇫🇷","France"],["🇩🇪","Germany"],
  ["🇪🇸","Spain"],["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],
  ["🏳️","(None)"]
];

const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);
const nextPoint = (p: Point): Point => (p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad");
const prevPoint = (p: Point): Point => (p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40);

const makeDefault = (): ScoreState => ({
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
});

function normalize(v: any): ScoreState {
  const d = makeDefault();
  if (!v) return d;
  return {
    ...d,
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
    ts: typeof v?.ts === "number" ? v.ts : undefined,
  };
}

export default function ClientController({ courtId }: { courtId: string }) {
  const [s, setS] = useState<ScoreState>(makeDefault());
  const [courtName, setCourtName] = useState<string>("");

  const COURT_PATH = `/courts/${courtId}`;
  const META_NAME_PATH = `/courts/${courtId}/meta/name`;

  useEffect(() => {
    let unsub1 = () => {};
    let unsub2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub1 = onValue(ref(db, COURT_PATH), (snap) => setS(normalize(snap.val())));
      unsub2 = onValue(ref(db, META_NAME_PATH), (snap) => setCourtName(typeof snap.val() === "string" ? snap.val() : ""));
    })();
    return () => { unsub1?.(); unsub2?.(); };
  }, [COURT_PATH, META_NAME_PATH]);

  const commit = async (next: ScoreState) => {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  };
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
      ...makeDefault(),
      meta: { name: courtName, bestOf: (s.meta?.bestOf ?? 3) as BestOf },
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

  function renderRow(side: Side) {
    const p = s.players, sets = s.sets, games = s.games;

    const p1a = nameOrLabel(p["1a"].name, "Player 1");
    const p1b = nameOrLabel(p["1b"].name, "Player 2");
    const p2a = nameOrLabel(p["2a"].name, "Player 3");
    const p2b = nameOrLabel(p["2b"].name, "Player 4");

    const line = side === "p1"
      ? `${flag(p["1a"].cc)} ${p1a} / ${flag(p["1b"].cc)} ${p1b}`
      : `${flag(p["2a"].cc)} ${p2a} / ${flag(p["2b"].cc)} ${p2b}`;

    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finished) return side === "p1" ? sets.p1[i] ?? "" : sets.p2[i] ?? "";
      if (i === finished) return side === "p1" ? games.p1 ?? "" : games.p2 ?? "";
      return "";
    });

    const points = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    const scoreBoxStyle: React.CSSProperties = {
      background: "var(--c-muted)",
      color: "#0b1419",
      borderRadius: 12,
      minHeight: "2.6em",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
    };

    return (
      <div className="row" style={{
        display: "grid",
        gridTemplateColumns: "1fr 3rem minmax(0,1fr)",
        gap: "1rem",
        alignItems: "center",
        fontSize: "1.35em",
        margin: "10px 0",
      }}>
        <div className="teamline" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{line}</div>
        <div className="serve" style={{ textAlign: "center" }}>{s.server === side ? "🎾" : ""}</div>
        <div className="grid" style={{ display: "grid", gap: ".6rem", gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => (<div key={i} className="box" style={scoreBoxStyle}>{v}</div>))}
          <div className="box" style={scoreBoxStyle}>{String(points)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ background: "#212A31", minHeight: "100vh", padding: "18px 2vw" }}>
      <style>{`
        :root{ --c-ink:#212A31; --c-ink2:#0B1B2B; --c-primary:#124E66; --c-muted:#748D92; --c-cloud:#D3D9D4; }
        .container{ margin:0 auto; width:min(1100px,92vw); }
        .card{ background:var(--c-ink2); color:#fff; border:1px solid rgba(0,0,0,.15); border-radius:16px; padding:1.25rem; box-shadow:0 6px 20px rgba(0,0,0,.25); }
        .head{ display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:10px; }
        .title{ color:var(--c-cloud); font-size:1.4em; font-weight:800; }
        .select{ width:12em; border-radius:9999px; height:2.6em; background:var(--c-cloud); color:#0b1419; border:1px solid var(--c-muted); padding:0 .9em; }
        .panelGrid{ display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:1rem; }
        .panel{ background:rgba(33,42,49,.45); border:1px solid rgba(211,217,212,.12); border-radius:12px; padding:1rem; }
        .input{ width:100%; background:#D3D9D4; color:#0b1419; border:1px solid var(--c-muted); border-radius:10px; height:2.6em; padding:0 .9em; }
        .btn{ border:1px solid transparent; background:var(--c-primary); color:#fff; border-radius:12px; height:2.8em; padding:0 1.1em; font-weight:700; font-size:1em; }
        .btn-lg{ height:2.4em; }
        .pm{ font-size:2.3em; line-height:1; }
      `}</style>

      <div className="container">
        <div className="card">
          <div className="head">
            <div className="title">{courtName || courtId.replace(/^\w/, c => c.toUpperCase())}</div>
            <select className="select" aria-label="Best of" value={s.meta?.bestOf ?? 3} onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}>
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>

          {renderRow("p1")}
          {renderRow("p2")}

          <hr style={{ border: "none", height: 1, background: "rgba(211,217,212,.16)", margin: "10px 0 12px" }} />

          <div className="panelGrid">
            {/* Team 1 */}
            <div className="panel">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                <div>
                  <label>Player 1</label>
                  <input className="input" placeholder="Enter Name" value={s.players["1a"].name} onChange={(e)=>updatePlayer("1a","name",e.target.value)} />
                  <select className="input" value={s.players["1a"].cc} onChange={(e)=>updatePlayer("1a","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => (<option key={n} value={f}>{f} {n}</option>))}
                  </select>
                </div>
                <div>
                  <label>Player 2</label>
                  <input className="input" placeholder="Enter Name" value={s.players["1b"].name} onChange={(e)=>updatePlayer("1b","name",e.target.value)} />
                  <select className="input" value={s.players["1b"].cc} onChange={(e)=>updatePlayer("1b","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => (<option key={n} value={f}>{f} {n}</option>))}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem", marginTop:".75rem" }}>
                <button className="btn pm" onClick={()=>addPoint("p1", +1)}>+</button>
                <button className="btn pm" onClick={()=>addPoint("p1", -1)}>−</button>
              </div>
            </div>

            {/* Team 2 */}
            <div className="panel">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                <div>
                  <label>Player 3</label>
                  <input className="input" placeholder="Enter Name" value={s.players["2a"].name} onChange={(e)=>updatePlayer("2a","name",e.target.value)} />
                  <select className="input" value={s.players["2a"].cc} onChange={(e)=>updatePlayer("2a","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => (<option key={n} value={f}>{f} {n}</option>))}
                  </select>
                </div>
                <div>
                  <label>Player 4</label>
                  <input className="input" placeholder="Enter Name" value={s.players["2b"].name} onChange={(e)=>updatePlayer("2b","name",e.target.value)} />
                  <select className="input" value={s.players["2b"].cc} onChange={(e)=>updatePlayer("2b","cc",e.target.value)}>
                    {COUNTRIES.map(([f, n]) => (<option key={n} value={f}>{f} {n}</option>))}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem", marginTop:".75rem" }}>
                <button className="btn pm" onClick={()=>addPoint("p2", +1)}>+</button>
                <button className="btn pm" onClick={()=>addPoint("p2", -1)}>−</button>
              </div>
            </div>
          </div>

          <div style={{ display:"flex", gap:".75rem", justifyContent:"center", flexWrap:"wrap", marginTop:".9rem" }}>
            <button className="btn" style={{ background:"#8b2e2e" }} onClick={resetGame}>Reset Game</button>
            <button className="btn" style={{ background:"#748D92", color:"#0b1419" }} onClick={newMatch}>New Match</button>
            <button className="btn" onClick={toggleServer} title="Toggle server">Serve🎾</button>
          </div>
        </div>
      </div>
    </div>
  );
}

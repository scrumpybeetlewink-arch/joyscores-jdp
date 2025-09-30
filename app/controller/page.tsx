"use client";

import { useEffect, useState, useMemo } from "react";
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

const COURT_PATH = "/joyscores/court1";
const META_NAME_PATH = "/joyscores/court1/meta/name";

const COUNTRIES: Array<[flag: string, name: string]> = [
  ["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇹🇭","Thailand"],["🇮🇩","Indonesia"],["🇵🇭","Philippines"],
  ["🇻🇳","Vietnam"],["🇮🇳","India"],["🇯🇵","Japan"],["🇰🇷","South Korea"],["🇨🇳","China"],
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇫🇷","France"],["🇩🇪","Germany"],
  ["🇪🇸","Spain"],["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],
  ["🏳️","(None)"]
];

const flag = (cc: string) => cc || "🏳️";
const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;

const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

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
      name: (v?.meta?.name ?? ""),
      bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
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

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();
    if (n.tiebreak) {
      n.tb[side] = Math.max(0, n.tb[side] + dir);
      return commit(n);
    }
    if (dir === 1) {
      const opp: Side = side === "p1" ? "p2" : "p1";
      const ps = n.points[side], po = n.points[opp];
      if (ps === 40 && (po === 0 || po === 15 || po === 30)) n.games[side] += 1, n.points={p1:0,p2:0};
      else if (ps === 40 && po === "Ad") n.points[opp] = 40;
      else if (ps === 40 && po === 40) n.points[side] = "Ad";
      else if (ps === "Ad") n.games[side] += 1, n.points={p1:0,p2:0};
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
    n.games.p1 = 0; n.games.p2 = 0;
    n.points = { p1: 0, p2: 0 };
    commit(n);
  }

  function resetPoints() {
    const n = clone();
    n.points = { p1: 0, p2: 0 };
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

  return (
    <div style={{ background: "var(--c-ink)", minHeight: "100vh" }}>
      <style>{`
        :root{
          --c-ink:#212A31;
          --c-ink-2:#0B1B2B;
          --c-primary:#124E66;
          --c-muted:#748D92;
          --c-cloud:#D3D9D4;
        }
        .btn{border:1px solid transparent;background:var(--c-primary);color:#fff;border-radius:12px;height:2.8em;padding:0 1.1em;font-weight:700;font-size:1em;}
        .btn-lg{height:2.8em;}
        .btn-danger{background:#8b2e2e;}
        .btn-gold{background:var(--c-muted);color:#0b1419;}
      `}</style>

      <div style={{ width: "min(1200px, 95vw)", margin:"0 auto", paddingTop: 18, paddingBottom: 24 }}>
        <div style={{ background:"var(--c-ink-2)",color:"#fff",border:"1px solid rgba(0,0,0,0.15)",borderRadius:16,padding:"1rem",boxShadow:"0 6px 20px rgba(0,0,0,0.25)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:"1rem" }}>
            <div style={{ color:"var(--c-cloud)",fontSize:"1.4em",fontWeight:700 }}>{externalCourtName}</div>
            <select
              aria-label="Best of"
              className="btn"
              style={{ borderRadius:9999,padding:"0 .9em",width:"12em" }}
              value={s.meta?.bestOf ?? 3}
              onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}
            >
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>

          {/* player inputs */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"1rem",marginBottom:"1rem" }}>
            {/* Team A */}
            <div>
              <label>Player 1</label>
              <input className="btn" style={{width:"100%"}} value={s.players["1a"].name} onChange={(e)=>updatePlayer("1a","name",e.target.value)} />
              <select className="btn" value={s.players["1a"].cc} onChange={(e)=>updatePlayer("1a","cc",e.target.value)}>
                {COUNTRIES.map(([f,n])=><option key={f} value={f}>{f} {n}</option>)}
              </select>
              <label>Player 2</label>
              <input className="btn" style={{width:"100%"}} value={s.players["1b"].name} onChange={(e)=>updatePlayer("1b","name",e.target.value)} />
              <select className="btn" value={s.players["1b"].cc} onChange={(e)=>updatePlayer("1b","cc",e.target.value)}>
                {COUNTRIES.map(([f,n])=><option key={f} value={f}>{f} {n}</option>)}
              </select>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",marginTop:".5rem"}}>
                <button className="btn btn-lg" onClick={()=>addPoint("p1",+1)}>+</button>
                <button className="btn btn-lg" onClick={()=>addPoint("p1",-1)}>−</button>
              </div>
            </div>
            {/* Team B */}
            <div>
              <label>Player 3</label>
              <input className="btn" style={{width:"100%"}} value={s.players["2a"].name} onChange={(e)=>updatePlayer("2a","name",e.target.value)} />
              <select className="btn" value={s.players["2a"].cc} onChange={(e)=>updatePlayer("2a","cc",e.target.value)}>
                {COUNTRIES.map(([f,n])=><option key={f} value={f}>{f} {n}</option>)}
              </select>
              <label>Player 4</label>
              <input className="btn" style={{width:"100%"}} value={s.players["2b"].name} onChange={(e)=>updatePlayer("2b","name",e.target.value)} />
              <select className="btn" value={s.players["2b"].cc} onChange={(e)=>updatePlayer("2b","cc",e.target.value)}>
                {COUNTRIES.map(([f,n])=><option key={f} value={f}>{f} {n}</option>)}
              </select>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",marginTop:".5rem"}}>
                <button className="btn btn-lg" onClick={()=>addPoint("p2",+1)}>+</button>
                <button className="btn btn-lg" onClick={()=>addPoint("p2",-1)}>−</button>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display:"flex",gap:".75rem",flexWrap:"wrap",justifyContent:"center" }}>
            <button className="btn btn-danger btn-lg" onClick={resetGame}>Reset Game</button>
            <button className="btn btn-danger btn-lg" onClick={resetPoints}>Reset Points</button>
            <button className="btn btn-gold btn-lg" onClick={newMatch}>New Match</button>
            <button className="btn btn-lg" onClick={toggleServer} style={{background:"var(--c-primary)"}}>Serve 🎾</button>
          </div>
        </div>
      </div>
    </div>
  );
}

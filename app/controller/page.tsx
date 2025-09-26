// @ts-nocheck
"use client";
export const dynamic = "force-static";

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

const COUNTRIES: Array<[string, string]> = [
  ["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇹🇭","Thailand"],["🇮🇩","Indonesia"],["🇵🇭","Philippines"],
  ["🇻🇳","Vietnam"],["🇮🇳","India"],["🇯🇵","Japan"],["🇰🇷","South Korea"],["🇨🇳","China"],
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇫🇷","France"],["🇩🇪","Germany"],
  ["🇪🇸","Spain"],["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],["🏳️","(None)"],
];

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: { "1a": { name: "", cc: "🇲🇾" }, "1b": { name: "", cc: "🇲🇾" }, "2a": { name: "", cc: "🇲🇾" }, "2b": { name: "", cc: "🇲🇾" } },
  points: { p1: 0, p2: 0 }, games: { p1: 0, p2: 0 }, sets: { p1: [], p2: [] },
  tiebreak: false, tb: { p1: 0, p2: 0 }, server: "p1", ts: undefined,
};

const flag = (cc: string) => cc || "🏳️";
const nameOr = (n: string, fb: string) => (n?.trim() ? n : fb);
const nextPoint = (p: Point): Point => (p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : "Ad");
const prevPoint = (p: Point): Point => (p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40);

function getCourtKey(): string {
  if (typeof window === "undefined") return "court1";
  const u = new URL(window.location.href);
  const c = (u.searchParams.get("c") || "").toLowerCase();
  return /^court[1-5]$/.test(c) ? c : "court1";
}
const courtPath = () => `/courts/${getCourtKey()}`;
const metaNamePath = () => `${courtPath()}/meta/name`;

function normalize(v: any): ScoreState {
  const s = { ...defaultState };
  if (!v) return s;
  s.meta.name = v?.meta?.name ?? "";
  s.meta.bestOf = v?.meta?.bestOf === 5 ? 5 : 3;
  ["1a","1b","2a","2b"].forEach((k) => {
    s.players[k].name = v?.players?.[k]?.name ?? "";
    s.players[k].cc   = v?.players?.[k]?.cc   ?? "🇲🇾";
  });
  s.points.p1 = (v?.points?.p1 ?? 0) as Point; s.points.p2 = (v?.points?.p2 ?? 0) as Point;
  s.games.p1  = Number.isFinite(v?.games?.p1) ? v.games.p1 : 0;
  s.games.p2  = Number.isFinite(v?.games?.p2) ? v.games.p2 : 0;
  s.sets.p1   = Array.isArray(v?.sets?.p1) ? v.sets.p1 : [];
  s.sets.p2   = Array.isArray(v?.sets?.p2) ? v.sets.p2 : [];
  s.tiebreak  = !!v?.tiebreak;
  s.tb.p1     = Number.isFinite(v?.tb?.p1) ? v.tb.p1 : 0;
  s.tb.p2     = Number.isFinite(v?.tb?.p2) ? v.tb.p2 : 0;
  s.server    = v?.server === "p1" || v?.server === "p2" ? v.server : "p1";
  s.ts        = typeof v?.ts === "number" ? v.ts : undefined;
  return s;
}

export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [externalName, setExternalName] = useState<string>("");

  useEffect(() => {
    let unsub1 = () => {}; let unsub2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub1 = onValue(ref(db, courtPath()), (snap) => setS(normalize(snap.val())));
      unsub2 = onValue(ref(db, metaNamePath()), (snap) => setExternalName(typeof snap.val() === "string" ? snap.val() : ""));
    })();
    return () => { unsub1?.(); unsub2?.(); };
  }, []);

  async function commit(next: ScoreState) { next.ts = Date.now(); await set(ref(db, courtPath()), next); }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1; n.points = { p1: 0, p2: 0 };
    const a = n.games.p1, b = n.games.p2, lead = Math.abs(a - b);
    if ((a >= 6 || b >= 6) && lead >= 2) {
      n.sets.p1.push(a); n.sets.p2.push(b); n.games = { p1: 0, p2: 0 }; n.tiebreak = false; n.tb = { p1: 0, p2: 0 };
    } else if (a === 6 && b === 6) { n.tiebreak = true; n.tb = { p1: 0, p2: 0 }; }
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
      else n.points[side] = nextPoint(ps);
    } else {
      n.points[side] = prevPoint(n.points[side]);
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
      meta: { name: externalName, bestOf: (s.meta?.bestOf ?? 3) as BestOf },
      ts: Date.now(),
    });
  }
  async function updatePlayer(k: "1a"|"1b"|"2a"|"2b", f: "name"|"cc", val: string) {
    const n = clone(); (n.players[k] as any)[f] = val; await commit(n);
  }
  async function updateBestOf(v: BestOf) { const n = clone(); n.meta.bestOf = v; await commit(n); }

  const maxSets = useMemo(() => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s.meta?.bestOf]);

  function renderRow(side: Side) {
    const p = s.players, sets = s.sets, games = s.games;
    const p1a = nameOr(p["1a"].name, "Player 1"), p1b = nameOr(p["1b"].name, "Player 2");
    const p2a = nameOr(p["2a"].name, "Player 3"), p2b = nameOr(p["2b"].name, "Player 4");
    const teamLine = side === "p1"
      ? `${flag(p["1a"].cc)} ${p1a} / ${flag(p["1b"].cc)} ${p1b}`
      : `${flag(p["2a"].cc)} ${p2a} / ${flag(p["2b"].cc)} ${p2b}`;
    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({ length: maxSets }).map((_, i) =>
      i < finished ? (side === "p1" ? sets.p1[i] ?? "" : sets.p2[i] ?? "")
      : i === finished ? (side === "p1" ? games.p1 ?? "" : games.p2 ?? "")
      : ""
    );
    const pointsLabel = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    const box = { background: "var(--c-muted)", color: "#0b1419", borderRadius: 10, minHeight: "2.1em",
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 } as const;

    return (
      <div className="row" style={{ display: "grid", gridTemplateColumns: "1fr 3.2em minmax(0,1fr)", gap: ".75em", alignItems: "center", fontSize: "1.5em" }}>
        <div className="teamline" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{teamLine}</div>
        <div className="serveCol" style={{ display: "flex", justifyContent: "center" }}>{s.server === side && <span title="Serving">🎾</span>}</div>
        <div className="scoreGrid" style={{ display: "grid", gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)`, gap: ".4em" }}>
          {setCells.map((v, i) => (<div key={i} style={box}>{v}</div>))}
          <div style={box}>{String(pointsLabel)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ background: "var(--c-ink)", minHeight: "100vh", padding: 18 }}>
      <style>{`
        :root{ --c-ink:#212A31; --c-ink-2:#0B1B2B; --c-primary:#124E66; --c-muted:#748D92; --c-cloud:#D3D9D4; }
        .card{ background: var(--c-ink-2); color:#fff; border:1px solid rgba(0,0,0,.15); border-radius:16px; padding:1rem; box-shadow:0 6px 20px rgba(0,0,0,.25); }
        .bestOf{ width:12em; border-radius:9999px; height:2.6em; background: var(--c-cloud); color:#0b1419; border:1px solid var(--c-muted); padding: 0 .9em; }
        .input{ width:100%; background:#D3D9D4; color:#0b1419; border:1px solid var(--c-muted); border-radius:10px; height:2.6em; padding:0 .9em; }
        .btn{ border:1px solid transparent; background:var(--c-primary); color:#fff; border-radius:12px; height:2.8em; padding:0 1.1em; font-weight:700; }
        .btn-danger{ background:#8b2e2e; } .btn-gold{ background:var(--c-muted); color:#0b1419; }
        .grid2{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 1rem; }
      `}</style>

      <div className="card" style={{ margin: "0 auto", width: "min(1200px,95vw)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 10 }}>
          <div style={{ color: "var(--c-cloud)", fontSize: "1.4em", fontWeight: 800 }}>{externalName || "Court"}</div>
          <select className="bestOf" value={s.meta?.bestOf ?? 3} onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}>
            <option value={3}>Best of 3</option><option value={5}>Best of 5</option>
          </select>
        </div>

        {renderRow("p1")}
        {renderRow("p2")}

        <div style={{ height: 1, background: "rgba(211,217,212,.18)", margin: "1rem 0" }} />

        <div className="grid2">
          {/* Team A */}
          <div style={{ background: "rgba(33,42,49,.45)", border: "1px solid rgba(211,217,212,.12)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Player 1</label>
                <input className="input" placeholder="Enter Name" value={s.players["1a"].name} onChange={(e)=>updatePlayer("1a","name",e.target.value)} />
                <select className="input" value={s.players["1a"].cc} onChange={(e)=>updatePlayer("1a","cc",e.target.value)}>
                  {COUNTRIES.map(([f,n]) => <option key={f+n} value={f}>{f} {n}</option>)}
                </select>
              </div>
              <div>
                <label>Player 2</label>
                <input className="input" placeholder="Enter Name" value={s.players["1b"].name} onChange={(e)=>updatePlayer("1b","name",e.target.value)} />
                <select className="input" value={s.players["1b"].cc} onChange={(e)=>updatePlayer("1b","cc",e.target.value)}>
                  {COUNTRIES.map(([f,n]) => <option key={f+n} value={f}>{f} {n}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
              <button className="btn" style={{ fontSize: "2.1em" }} onClick={()=>addPoint("p1", +1)}>+</button>
              <button className="btn" style={{ fontSize: "2.1em" }} onClick={()=>addPoint("p1", -1)}>−</button>
            </div>
          </div>

          {/* Team B */}
          <div style={{ background: "rgba(33,42,49,.45)", border: "1px solid rgba(211,217,212,.12)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Player 3</label>
                <input className="input" placeholder="Enter Name" value={s.players["2a"].name} onChange={(e)=>updatePlayer("2a","name",e.target.value)} />
                <select className="input" value={s.players["2a"].cc} onChange={(e)=>updatePlayer("2a","cc",e.target.value)}>
                  {COUNTRIES.map(([f,n]) => <option key={f+n} value={f}>{f} {n}</option>)}
                </select>
              </div>
              <div>
                <label>Player 4</label>
                <input className="input" placeholder="Enter Name" value={s.players["2b"].name} onChange={(e)=>updatePlayer("2b","name",e.target.value)} />
                <select className="input" value={s.players["2b"].cc} onChange={(e)=>updatePlayer("2b","cc",e.target.value)}>
                  {COUNTRIES.map(([f,n]) => <option key={f+n} value={f}>{f} {n}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
              <button className="btn" style={{ fontSize: "2.1em" }} onClick={()=>addPoint("p2", +1)}>+</button>
              <button className="btn" style={{ fontSize: "2.1em" }} onClick={()=>addPoint("p2", -1)}>−</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
          <button className="btn btn-danger" onClick={resetGame}>Reset Game</button>
          <button className="btn btn-gold"   onClick={newMatch}>New Match</button>
          <button className="btn" onClick={toggleServer} title="Toggle server">Serve🎾</button>
        </div>
      </div>
    </div>
  );
}

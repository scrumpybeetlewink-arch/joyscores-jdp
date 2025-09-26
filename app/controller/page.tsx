"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { onValue, ref, set } from "firebase/database";

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

/** ---------- Unified paths (match Index & Live) ---------- */
const COURT_PATH = "/courts/court1";                    // <- unified
const META_NAME_PATH = "/courts/court1/meta/name";      // <- unified

/** ---------- Helpers / defaults ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fb: string) => (n?.trim() ? n : fb);
const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point => (p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40);

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
  if (!v) return defaultState;
  return {
    ...defaultState,
    ...v,
    meta: {
      name: v?.meta?.name ?? "",
      bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
    },
  };
}

export default function ControllerPage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [externalCourtName, setExternalCourtName] = useState("");

  useEffect(() => {
    let off1 = () => {};
    let off2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      off1 = onValue(ref(db, COURT_PATH), (snap) => setS(normalize(snap.val())));
      off2 = onValue(ref(db, META_NAME_PATH), (snap) => {
        const v = snap.val();
        setExternalCourtName(typeof v === "string" ? v : "");
      });
    })();
    return () => { off1?.(); off2?.(); };
  }, []);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function winGame(n: ScoreState, side: Side) {
    n.games[side] += 1;
    n.points = { p1: 0, p2: 0 };
    const a = n.games.p1, b = n.games.p2, lead = Math.abs(a - b);
    if ((a >= 6 || b >= 6) && lead >= 2) {
      n.sets.p1.push(a); n.sets.p2.push(b);
      n.games = { p1: 0, p2: 0 };
      n.tiebreak = false; n.tb = { p1: 0, p2: 0 };
    } else if (a === 6 && b === 6) {
      n.tiebreak = true; n.tb = { p1: 0, p2: 0 };
    }
  }

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();

    if (n.tiebreak) {
      n.tb[side] = Math.max(0, n.tb[side] + dir);
      const A = n.tb.p1, B = n.tb.p2;
      if ((A >= 7 || B >= 7) && Math.abs(A - B) >= 2) {
        if (A > B) { n.sets.p1.push(n.games.p1 + 1); n.sets.p2.push(n.games.p2); }
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
    const n = clone();
    const { p1, p2 } = n.games;
    if (p1 > p2) n.games.p1 = Math.max(0, p1 - 1);
    else if (p2 > p1) n.games.p2 = Math.max(0, p2 - 1);
    commit(n);
  }

  /** keep name in perfect sync with index + live */
  async function newMatch() {
    const next: ScoreState = {
      ...defaultState,
      meta: { name: externalCourtName, bestOf: (s.meta?.bestOf ?? 3) as BestOf },
      server: "p1",
      ts: Date.now(),
    };

    // 1) write the new court object
    await set(ref(db, COURT_PATH), next);
    // 2) explicitly write the leaf name (covers any listeners bound just to meta/name)
    await set(ref(db, META_NAME_PATH), externalCourtName || "");
  }

  async function updatePlayer(k:"1a"|"1b"|"2a"|"2b", f:"name"|"cc", v:string) {
    const n = clone(); (n.players[k] as any)[f] = v; await commit(n);
  }
  async function updateBestOf(v: BestOf) { const n = clone(); n.meta.bestOf = v; await commit(n); }

  const maxSets = useMemo(() => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s.meta?.bestOf]);

  /** ---------- Score rows (same spacing as Live) ---------- */
  function Row({ side }: { side: Side }) {
    const { players, sets, games } = s;
    const p1a = nameOrLabel(players["1a"].name, "Player 1");
    const p1b = nameOrLabel(players["1b"].name, "Player 2");
    const p2a = nameOrLabel(players["2a"].name, "Player 3");
    const p2b = nameOrLabel(players["2b"].name, "Player 4");

    const line =
      side === "p1"
        ? `${flag(players["1a"].cc)} ${p1a} / ${flag(players["1b"].cc)} ${p1b}`
        : `${flag(players["2a"].cc)} ${p2a} / ${flag(players["2b"].cc)} ${p2b}`;

    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finished) return side === "p1" ? sets.p1[i] ?? "" : sets.p2[i] ?? "";
      if (i === finished) return side === "p1" ? (games.p1 ?? "") : (games.p2 ?? "");
      return "";
    });

    const points = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    return (
      <div className="row">
        <div className="teamline">{line}</div>
        <div className="serve">{s.server === side ? "🎾" : ""}</div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => <div key={i} className="box">{v}</div>)}
          <div className="box">{String(points)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --primary:#124E66; --muted:#748D92; --cloud:#D3D9D4; }
        .wrap{ background:var(--ink); min-height:100vh; padding:18px 2vw; }
        .container{ margin:0 auto; width:min(1100px,92vw); }
        .card{ background:var(--ink2); color:#fff; border:1px solid rgba(0,0,0,.15);
               border-radius:16px; padding:1.25rem; box-shadow:0 6px 20px rgba(0,0,0,.25); }

        /* spacing identical to Live */
        .rows{ display:grid; gap:.9rem; margin: 6px 0 10px; }
        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr);
              gap:1rem; align-items:center; font-size:1.28em; }
        .teamline{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .grid{ display:grid; gap:.6rem; }
        .box{ background:var(--muted); color:#0b1419; border-radius:12px; min-height:2.4em;
              display:flex; align-items:center; justify-content:center; font-weight:800; }

        .head{ display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:10px; }
        .title{ color:var(--cloud); font-size:1.4em; font-weight:800; }
        .select{ width:12em; border-radius:9999px; height:2.6em; background:var(--cloud);
                 color:#0b1419; border:1px solid var(--muted); padding:0 .9em; }

        .panelGrid{ display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:1rem; }
        .panel{ background:rgba(33,42,49,.45); border:1px solid rgba(211,217,212,.12);
                border-radius:12px; padding:1rem; }
        .input{ width:100%; background:#D3D9D4; color:#0b1419; border:1px solid var(--muted);
                border-radius:10px; height:2.6em; padding:0 .9em; }
        .btn{ border:1px solid transparent; background:var(--primary); color:#fff;
              border-radius:12px; height:2.8em; padding:0 1.1em; font-weight:700; font-size:1em; }
      `}</style>

      <div className="container">
        <div className="card">
          <div className="head">
            <div className="title">{externalCourtName || "Court"}</div>
            <select className="select"
              value={s.meta?.bestOf ?? 3}
              onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}
            >
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </div>

          <div className="rows">
            <Row side="p1" />
            <Row side="p2" />
          </div>

          <hr style={{ border: "none", height: 1, background: "rgba(211,217,212,.18)", margin: "0.75rem 0 1rem" }} />

          {/* Team panels ... (unchanged) */}
          {/* (keep your existing team panels + buttons here) */}
        </div>
      </div>
    </div>
  );
}

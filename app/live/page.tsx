"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

export const dynamic = "force-static";

/* ---------- Types ---------- */
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

/* ---------- Defaults ---------- */
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

/* ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOr = (n: string, fallback: string) => (n?.trim() ? n : fallback);

function normalize(v: any): ScoreState {
  if (!v) return defaultState;
  return {
    ...defaultState,
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
  };
}

/* =========================================================
 *  Live (read-only) — query param ?court=court1
 * =========================================================
 */
function LiveInner() {
  const qp = useSearchParams();
  const court = (qp.get("court") || "court1").trim() || "court1";
  const PATH = `/courts/${court}`;
  const NAME_PATH = `${PATH}/meta/name`;

  const [s, setS] = useState<ScoreState>(defaultState);
  const [courtName, setCourtName] = useState<string>("");

  useEffect(() => {
    let offScore = () => {};
    let offName = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      offScore = onValue(ref(db, PATH), (snap) => setS(normalize(snap.val())));
      offName = onValue(ref(db, NAME_PATH), (snap) => {
        const v = snap.val();
        setCourtName(typeof v === "string" ? v : "");
      });
    })();
    return () => { offScore?.(); offName?.(); };
  }, [PATH, NAME_PATH]);

  const maxSets = useMemo(() => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s.meta?.bestOf]);

  const Row = ({ side }: { side: Side }) => {
    const players = s.players ?? defaultState.players;
    const sets = s.sets ?? defaultState.sets;
    const games = s.games ?? defaultState.games;

    const p1a = nameOr(players["1a"]?.name, "Player 1");
    const p1b = nameOr(players["1b"]?.name, "Player 2");
    const p2a = nameOr(players["2a"]?.name, "Player 3");
    const p2b = nameOr(players["2b"]?.name, "Player 4");

    const line =
      side === "p1"
        ? `${flag(players["1a"]?.cc)} ${p1a} / ${flag(players["1b"]?.cc)} ${p1b}`
        : `${flag(players["2a"]?.cc)} ${p2a} / ${flag(players["2b"]?.cc)} ${p2b}`;

    const finished = Math.max(sets.p1?.length ?? 0, sets.p2?.length ?? 0);
    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finished) return side === "p1" ? (sets.p1?.[i] ?? "") : (sets.p2?.[i] ?? "");
      if (i === finished) return side === "p1" ? (games?.p1 ?? "") : (games?.p2 ?? "");
      return "";
    });

    const points = s.tiebreak ? `TB ${(s.tb ?? defaultState.tb)[side]}` : (s.points ?? defaultState.points)[side];

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
  };

  return (
    <main className="wrap">
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --muted:#748D92; --cloud:#D3D9D4; }
        .wrap{ min-height:100vh; background:var(--ink); display:flex; align-items:center; justify-content:center; padding:2vh 2vw; color:#fff; }
        .card{ width:min(1100px,95vw); background:var(--ink2); color:#fff; border-radius:16px; box-shadow:0 6px 20px rgba(0,0,0,.25); padding:1rem 1.25rem; }
        .header{ text-align:center; padding-bottom:.8rem; border-bottom:1px solid rgba(211,217,212,.16); }
        .court{ font-size:1.5em; font-weight:800; color:var(--cloud); }

        .rows{ display:grid; gap:.9rem; margin-top:.9rem; }
        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.28em; }
        .teamline{ color:var(--cloud); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .grid{ display:grid; gap:.6rem; }            /* spacing mirrors Controller */
        .box{ background:var(--muted); color:#0b1419; border-radius:12px; min-height:2.4em; display:flex; align-items:center; justify-content:center; font-weight:800; }
      `}</style>

      <section className="card">
        <div className="header"><div className="court">{courtName || court}</div></div>
        <div className="rows">
          <Row side="p1" />
          <Row side="p2" />
        </div>
      </section>
    </main>
  );
}

/* Wrap with Suspense for useSearchParams */
export default function LivePage() {
  return (
    <Suspense fallback={null}>
      <LiveInner />
    </Suspense>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

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
};

/** ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOr = (n: string, fb: string) => (n?.trim() ? n : fb);

/** ---------- Normalize RTDB ---------- */
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

export default function OverlayPage() {
  const params = useSearchParams();
  const courtKey = (params.get("c") || "court1").trim();     // ?c=court2
  const scale = Math.max(0.25, Number(params.get("s") || "1")); // ?s=0.9 to shrink

  const [s, setS] = useState<ScoreState>(defaultState);
  const maxSets = useMemo(
    () => ((s.meta.bestOf ?? 3) === 5 ? 5 : 3),
    [s.meta.bestOf]
  );

  // subscribe
  useEffect(() => {
    let off = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      off = onValue(ref(db, `/courts/${courtKey}`), (snap) => {
        setS(normalize(snap.val()));
      });
    })();
    return () => off?.();
  }, [courtKey]);

  const Row = ({ side }: { side: Side }) => {
    const P = s.players;
    const sets = s.sets;
    const games = s.games;

    const p1a = nameOr(P["1a"].name, "Player 1");
    const p1b = nameOr(P["1b"].name, "Player 2");
    const p2a = nameOr(P["2a"].name, "Player 3");
    const p2b = nameOr(P["2b"].name, "Player 4");

    const line =
      side === "p1"
        ? `${flag(P["1a"].cc)} ${p1a} / ${flag(P["1b"].cc)} ${p1b}`
        : `${flag(P["2a"].cc)} ${p2a} / ${flag(P["2b"].cc)} ${p2b}`;

    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finished) return side === "p1" ? sets.p1[i] ?? "" : sets.p2[i] ?? "";
      if (i === finished) return side === "p1" ? games.p1 ?? "" : games.p2 ?? "";
      return "";
    });

    const points = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    return (
      <div className="r">
        <div className="team">{line}</div>
        <div className="serve">{s.server === side ? "🎾" : ""}</div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => (
            <div key={i} className="box">{v}</div>
          ))}
          <div className="box">{String(points)}</div>
        </div>
      </div>
    );
  };

  return (
    <main className="wrap" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
      <style>{`
        /* Transparent for OBS */
        html, body { background: transparent !important; }
        :root{ --ink2:#0B1B2B; --muted:#748D92; --cloud:#D3D9D4; }
        .wrap{
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial;
          color: #fff;
          padding: 8px 12px;
        }
        .card{
          background: rgba(11,27,43,.85);
          border-radius: 16px;
          padding: 10px 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,.35);
          border: 1px solid rgba(255,255,255,.08);
          width: min(1100px, 95vw);
        }
        .title{
          text-align:center; font-weight:900; letter-spacing:.5px; margin-bottom:8px;
          color: var(--cloud); font-size: 28px;
        }
        .rows{ display:grid; gap:10px; }
        .r{ display:grid; grid-template-columns: 1fr 2.8rem minmax(0,1fr); gap:10px; align-items:center; font-size:22px; }
        .team{ color: var(--cloud); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .grid{ display:grid; gap:8px; }
        .box{
          background: var(--muted); color: #0b1419; border-radius: 10px; min-height: 1.9em;
          display:flex; align-items:center; justify-content:center; font-weight:800;
        }
      `}</style>

      <section className="card">
        <div className="title">{s.meta.name || "Court"}</div>
        <div className="rows">
          <Row side="p1" />
          <Row side="p2" />
        </div>
      </section>
    </main>
  );
}

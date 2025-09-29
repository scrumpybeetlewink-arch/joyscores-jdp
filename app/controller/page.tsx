"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

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

const defaultState: ScoreState = {
  meta: { name: "Court", bestOf: 3 },
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

function normalize(v: any): ScoreState {
  if (!v) return defaultState;
  return {
    ...defaultState,
    ...v,
    meta: {
      name: v?.meta?.name ?? defaultState.meta.name,
      bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
    },
  };
}

export default function LivePage() {
  const params = useParams<{ courtId: string }>();
  const courtId = String(params?.courtId || "court1");

  const COURT_PATH = `/courts/${courtId}`;
  const META_NAME_PATH = `/courts/${courtId}/meta/name`;

  const [s, setS] = useState<ScoreState>(defaultState);
  const [courtName, setCourtName] = useState<string>(defaultState.meta.name);

  useEffect(() => {
    let off1 = () => {};
    let off2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      off1 = onValue(ref(db, COURT_PATH), (snap) => setS(normalize(snap.val())));
      off2 = onValue(ref(db, META_NAME_PATH), (snap) => {
        const v = snap.val();
        if (typeof v === "string") setCourtName(v);
      });
    })();
    return () => { off1?.(); off2?.(); };
  }, [COURT_PATH, META_NAME_PATH]);

  const maxSets = useMemo(() => ((s?.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s?.meta?.bestOf]);

  const Row = ({ side }: { side: Side }) => {
    const players = s.players;
    const sets = s.sets;
    const games = s.games;

    const p1a = players["1a"].name?.trim() || "Player 1";
    const p1b = players["1b"].name?.trim() || "Player 2";
    const p2a = players["2a"].name?.trim() || "Player 3";
    const p2b = players["2b"].name?.trim() || "Player 4";

    const line =
      side === "p1"
        ? `${s.players["1a"].cc} ${p1a} / ${s.players["1b"].cc} ${p1b}`
        : `${s.players["2a"].cc} ${p2a} / ${s.players["2b"].cc} ${p2b}`;

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
        <div className="scoreGrid" style={{ gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => (
            <div key={i} className="scoreBox">{v}</div>
          ))}
          <div className="scoreBox">{String(points)}</div>
        </div>
      </div>
    );
  };

  return (
    <main className="wrap">
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --muted:#748D92; --cloud:#D3D9D4; }
        .wrap{ min-height:100vh; background:var(--ink); display:flex; align-items:center; justify-content:center; padding:2vh 2vw; }
        .card{ width:min(1100px,95vw); background:var(--ink2); color:#fff; border-radius:16px; box-shadow:0 6px 20px rgba(0,0,0,.25); padding:1rem 1.25rem; }
        .header{ text-align:center; padding-bottom:.8rem; border-bottom:1px solid rgba(211,217,212,.16); }
        .court{ font-size:1.5em; font-weight:800; color:var(--cloud); }

        .rows{ display:grid; gap:.9rem; margin-top:.9rem; }
        .row{ display:grid; grid-template-columns: 1fr 3rem minmax(0,1fr); gap:1rem; align-items:center; font-size:1.28em; }
        .teamline{ color:var(--cloud); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .scoreGrid{ display:grid; gap:.6rem; }
        .scoreBox{ background:var(--muted); color:#0b1419; border-radius:12px; min-height:2.4em; display:flex; align-items:center; justify-content:center; font-weight:800; }
      `}</style>

      <section className="card">
        <div className="header"><div className="court">{courtName || "Court"}</div></div>
        <div className="rows">
          <Row side="p1" />
          <Row side="p2" />
        </div>
      </section>
    </main>
  );
}

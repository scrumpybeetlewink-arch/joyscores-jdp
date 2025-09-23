// app/live/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase.client";
import { ref, onValue, type DatabaseReference } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf; goldenPoint: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: Record<Side, number>;
};

const COURT_ID = "court1";

const DEFAULT: ScoreState = {
  meta: { name: "Court 1", bestOf: 3, goldenPoint: false },
  players: {
    "1a": { name: "P1A", cc: "my" },
    "1b": { name: "P1B", cc: "my" },
    "2a": { name: "P2A", cc: "my" },
    "2b": { name: "P2B", cc: "my" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: 0, p2: 0 },
};

function withDefaults(v: any): ScoreState {
  const s = v ?? {};
  return {
    meta: {
      name: s.meta?.name ?? DEFAULT.meta.name,
      bestOf: (s.meta?.bestOf as BestOf) ?? DEFAULT.meta.bestOf,
      goldenPoint: typeof s.meta?.goldenPoint === "boolean" ? s.meta.goldenPoint : false,
    },
    players: {
      "1a": { name: s.players?.["1a"]?.name ?? "P1A", cc: s.players?.["1a"]?.cc ?? "my" },
      "1b": { name: s.players?.["1b"]?.name ?? "P1B", cc: s.players?.["1b"]?.cc ?? "my" },
      "2a": { name: s.players?.["2a"]?.name ?? "P2A", cc: s.players?.["2a"]?.cc ?? "my" },
      "2b": { name: s.players?.["2b"]?.name ?? "P2B", cc: s.players?.["2b"]?.cc ?? "my" },
    },
    points: { p1: s.points?.p1 ?? 0, p2: s.points?.p2 ?? 0 },
    games: { p1: s.games?.p1 ?? 0, p2: s.games?.p2 ?? 0 },
    sets: { p1: s.sets?.p1 ?? 0, p2: s.sets?.p2 ?? 0 },
  };
}

export default function LivePage() {
  const [state, setState] = useState<ScoreState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const courtRef: DatabaseReference | null = useMemo(() => {
    if (!db) return null;
    return ref(db, `courts/${COURT_ID}`);
  }, [db]);

  useEffect(() => {
    if (!db || !courtRef) {
      setErr("Firebase not initialized (check env vars and firebase.client.ts).");
      return;
    }
    const off = onValue(
      courtRef,
      (snap) => setState(withDefaults(snap.val())),
      (e) => setErr(`Database error: ${String(e)}`)
    );
    return () => off();
  }, [courtRef, db]);

  if (err) return <div className="p-4 text-red-200 bg-red-900/40 rounded">{err}</div>;
  if (!state) return <div className="p-6 text-white">Loading…</div>;

  return (
    <div className="p-6 text-white space-y-6">
      <h1 className="text-2xl font-bold">{state.meta.name}</h1>
      <p>
        Best of {state.meta.bestOf} {state.meta.goldenPoint && "• Golden Point"}
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold">Team 1</h2>
          <p>{state.players["1a"].name} / {state.players["1b"].name}</p>
          <p>Sets: {state.sets.p1} | Games: {state.games.p1} | Points: {String(state.points.p1)}</p>
        </div>
        <div>
          <h2 className="font-semibold">Team 2</h2>
          <p>{state.players["2a"].name} / {state.players["2b"].name}</p>
          <p>Sets: {state.sets.p2} | Games: {state.games.p2} | Points: {String(state.points.p2)}</p>
        </div>
      </div>
    </div>
  );
}

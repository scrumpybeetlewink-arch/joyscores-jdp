// app/controller/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import {
  ref,
  onValue,
  set,
  update,
  type DatabaseReference,
} from "firebase/database";

/** ---------- Types ---------- */
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

/** ---------- Config ---------- */
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

/** Merge any old snapshot into the latest schema */
function withDefaults(v: any): ScoreState {
  const s = v ?? {};
  return {
    meta: {
      name: s.meta?.name ?? DEFAULT.meta.name,
      bestOf: (s.meta?.bestOf as BestOf) ?? DEFAULT.meta.bestOf,
      goldenPoint:
        typeof s.meta?.goldenPoint === "boolean"
          ? s.meta.goldenPoint
          : DEFAULT.meta.goldenPoint,
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

/** ---------- Page ---------- */
export default function ControllerPage() {
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

    ensureAnonLogin().catch((e) => setErr(`Auth error: ${String(e)}`));

    const off = onValue(
      courtRef,
      (snap) => {
        const merged = withDefaults(snap.val());
        // One-time migration to ensure goldenPoint exists
        if (!snap.exists() || snap.val()?.meta?.goldenPoint === undefined) {
          set(courtRef, merged).catch((e) => console.error("set error", e));
        }
        setState(merged);
      },
      (e) => setErr(`Database error: ${String(e)}`)
    );
    return () => off();
  }, [courtRef, db]);

  async function setGoldenPoint(on: boolean) {
    if (!courtRef) return;
    await update(ref(db!, `courts/${COURT_ID}/meta`), { goldenPoint: on });
  }

  async function incrementPoint(side: Side) {
    if (!courtRef || !state) return;
    const other: Record<Side, Side> = { p1: "p2", p2: "p1" };
    const cur = state.points[side];
    const opp = state.points[other[side]];
    const ladder: Point[] = [0, 15, 30, 40];

    function next(cur: Point, opp: Point, golden: boolean) {
      if (golden) {
        if (cur === 40) return { self: 0, opp: 0, gameWon: true };
        const i = ladder.indexOf(cur);
        return { self: ladder[Math.min(i + 1, 3)], opp, gameWon: false };
      }
      if (cur === "Ad") return { self: 0, opp: 0, gameWon: true };
      if (cur === 40 && opp === "Ad") return { self: 40, opp: 40, gameWon: false };
      if (cur === 40 && opp === 40) return { self: "Ad" as Point, opp: 40, gameWon: false };
      if (cur === 40) return { self: 0, opp: 0, gameWon: true };
      const i = ladder.indexOf(cur);
      return { self: ladder[Math.min(i + 1, 3)], opp, gameWon: false };
    }

    const n = next(cur, opp, state.meta.goldenPoint);
    if (n.gameWon) {
      await update(courtRef, {
        points: { p1: 0, p2: 0 },
        games: { ...state.games, [side]: state.games[side] + 1 },
      });
    } else {
      await update(courtRef, {
        points: { ...state.points, [side]: n.self, [other[side]]: n.opp },
      });
    }
  }

  if (err) return <div className="p-4 text-red-200 bg-red-900/40 rounded">{err}</div>;
  if (!state) return <div className="p-6 text-white">Loading…</div>;

  return (
    <div className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{state.meta.name}</h1>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.meta.goldenPoint}
            onChange={(e) => setGoldenPoint(e.target.checked)}
          />
          <span>Golden point</span>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          className="px-3 py-2 rounded bg-blue-600"
          onClick={() => incrementPoint("p1")}
        >
          + Point P1
        </button>
        <button
          className="px-3 py-2 rounded bg-pink-600"
          onClick={() => incrementPoint("p2")}
        >
          + Point P2
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold">Team 1</h2>
          <p>
            {state.players["1a"].name} / {state.players["1b"].name}
          </p>
          <p>
            Sets: {state.sets.p1} | Games: {state.games.p1} | Points:{" "}
            {String(state.points.p1)}
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Team 2</h2>
          <p>
            {state.players["2a"].name} / {state.players["2b"].name}
          </p>
          <p>
            Sets: {state.sets.p2} | Games: {state.games.p2} | Points:{" "}
            {String(state.points.p2)}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

/** ---------- Types (shared with Controller) ---------- */
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
  server: Side;
  golden: boolean;
};

/** =========================================================
 *  SSR/export-safe mount guard
 *  =========================================================
 */
export default function LivePage() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ScoreState | null>(null);

  // Prevent prerender crash during next export
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // skip rendering during build
  }

  /** -------- ensure Firebase anon login -------- */
  useEffect(() => {
    ensureAnonLogin();
  }, []);

  /** -------- determine current court -------- */
  const [court, setCourt] = useState("court1");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const qs = new URLSearchParams(window.location.search);
      setCourt(qs.get("court") || "court1");
    }
  }, []);

  /** -------- subscribe to RTDB -------- */
  useEffect(() => {
    if (!court) return;
    const scoreRef = ref(db, `courts/${court}/score`);
    const unsub = onValue(scoreRef, (snap) => {
      const v = snap.val();
      if (v) setState(v);
    });
    return () => unsub();
  }, [court]);

  if (!state) return <div className="p-4 text-center text-gray-400">Loading…</div>;

  /** -------- render scoreboard -------- */
  const { players, points, games, sets, meta, server } = state;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] text-white">
      <h1 className="text-3xl mb-4 font-semibold">{meta?.name || "Court"}</h1>

      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl text-center">
        <div>
          <p className="text-lg font-medium">
            {players["1a"]?.name} & {players["1b"]?.name}
          </p>
          <p className="text-sm opacity-75">
            Sets: {sets.p1.join(" ")} | Games: {games.p1} | Points: {points.p1}
          </p>
          {server === "p1" && <p className="text-yellow-400 text-sm mt-1">● Serving</p>}
        </div>

        <div>
          <p className="text-lg font-medium">
            {players["2a"]?.name} & {players["2b"]?.name}
          </p>
          <p className="text-sm opacity-75">
            Sets: {sets.p2.join(" ")} | Games: {games.p2} | Points: {points.p2}
          </p>
          {server === "p2" && <p className="text-yellow-400 text-sm mt-1">● Serving</p>}
        </div>
      </div>

      {state.golden && (
        <p className="mt-6 text-red-400 font-semibold text-lg">GOLDEN POINT</p>
      )}
    </div>
  );
}

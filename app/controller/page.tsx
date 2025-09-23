"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

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
  sets: { p1: number[]; p2: number[] };
};

export default function ControllerPage() {
  const [state, setState] = useState<ScoreState | null>(null);

  // --- Sync with Firebase ---
  useEffect(() => {
    ensureAnonLogin();
    const scoreRef = ref(db, "court1");
    return onValue(scoreRef, (snap) => {
      if (snap.exists()) setState(snap.val());
    });
  }, []);

  const update = (path: string, value: any) => {
    set(ref(db, `court1/${path}`), value);
  };

  if (!state) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6 text-white bg-neutral-900 min-h-screen">
      {/* --- Header Row: Match name, Golden Point toggle, Best Of dropdown --- */}
      <div className="flex items-center gap-4">
        <input
          className="text-xl bg-transparent border-b border-neutral-600 focus:outline-none flex-1"
          value={state.meta.name}
          onChange={(e) => update("meta/name", e.target.value)}
        />

        {/* Golden Point Toggle */}
        <button
          onClick={() => update("meta/goldenPoint", !state.meta.goldenPoint)}
          className={`px-3 py-1 rounded text-lg ${
            state.meta.goldenPoint
              ? "bg-yellow-500 text-black"
              : "bg-neutral-700 text-yellow-400"
          }`}
          title="Toggle Golden Point"
        >
          {state.meta.goldenPoint ? "🟡" : "⚪"}
        </button>

        {/* Best Of Dropdown */}
        <select
          value={state.meta.bestOf}
          onChange={(e) =>
            update("meta/bestOf", Number(e.target.value) as BestOf)
          }
          className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1"
        >
          <option value={3}>Best of 3</option>
          <option value={5}>Best of 5</option>
        </select>
      </div>

      {/* --- Players --- */}
      <div className="grid grid-cols-2 gap-6">
        {(["1a", "1b", "2a", "2b"] as const).map((key) => (
          <div key={key} className="space-y-2">
            <input
              className="w-full text-lg bg-transparent border-b border-neutral-600 focus:outline-none"
              value={state.players[key].name}
              onChange={(e) =>
                update(`players/${key}/name`, e.target.value)
              }
            />
          </div>
        ))}
      </div>

      {/* --- Scores --- */}
      <div className="grid grid-cols-2 gap-6 text-center">
        {(["p1", "p2"] as const).map((side) => (
          <div key={side} className="space-y-2">
            <div className="text-4xl">{state.points[side]}</div>
            <div className="text-lg">
              Games: {state.games[side]} | Sets: {state.sets[side].join(", ")}
            </div>
            <div className="flex justify-center gap-2">
              <button
                className="px-4 py-2 bg-green-600 rounded"
                onClick={() => update(`points/${side}`, nextPoint(state.points[side]))}
              >
                +
              </button>
              <button
                className="px-4 py-2 bg-red-600 rounded"
                onClick={() => update(`points/${side}`, prevPoint(state.points[side]))}
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** --- Helpers --- */
function nextPoint(p: Point): Point {
  if (p === 0) return 15;
  if (p === 15) return 30;
  if (p === 30) return 40;
  if (p === 40) return "Ad";
  return 0;
}
function prevPoint(p: Point): Point {
  if (p === "Ad") return 40;
  if (p === 40) return 30;
  if (p === 30) return 15;
  if (p === 15) return 0;
  return 0;
}

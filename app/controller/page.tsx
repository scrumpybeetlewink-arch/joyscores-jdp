// app/controller/[courtId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set, update } from "firebase/database";
import type { ScoreState, Side, Point, BestOf } from "@/lib/types";

const DEFAULT_STATE: ScoreState = {
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

/** Merge any partial/old snapshot into the latest schema. */
function withDefaults(snap: any): ScoreState {
  const s = snap ?? {};
  return {
    meta: {
      name: s.meta?.name ?? DEFAULT_STATE.meta.name,
      bestOf: (s.meta?.bestOf as BestOf) ?? DEFAULT_STATE.meta.bestOf,
      goldenPoint:
        typeof s.meta?.goldenPoint === "boolean"
          ? s.meta.goldenPoint
          : DEFAULT_STATE.meta.goldenPoint,
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

export default function ControllerPage() {
  const { courtId } = useParams<{ courtId: string }>();
  const courtRef = useMemo(() => ref(db, `courts/${courtId}`), [courtId]);
  const [state, setState] = useState<ScoreState | null>(null);

  // Ensure auth + subscribe
  useEffect(() => {
    ensureAnonLogin();
    const off = onValue(courtRef, (snap) => {
      const incoming = withDefaults(snap.val());
      // If snapshot missing fields (e.g., new goldenPoint), persist the migration:
      if (!snap.exists() || snap.val()?.meta?.goldenPoint === undefined) {
        void set(courtRef, incoming);
      }
      setState(incoming);
    });
    return () => off();
  }, [courtRef]);

  if (!state) return <div className="p-6 text-white">Loading…</div>;

  /** ---- Scoring helpers ---- */
  const other: Record<Side, Side> = { p1: "p2", p2: "p1" };

  function nextPoint(current: Point, opp: Point, goldenPoint: boolean): { self: Point; opp: Point; gameWon: boolean } {
    // Golden point: at 40–40 next point wins (no 'Ad')
    if (goldenPoint) {
      if (current === 40 && opp === 40) {
        return { self: 0, opp: 0, gameWon: true };
      }
      if (current === 40) {
        // You already had 40 and opponent < 40 -> this point wins game
        return { self: 0, opp: 0, gameWon: true };
      }
      // Regular progression up to 40
      const ladder: Point[] = [0, 15, 30, 40];
      const idx = ladder.indexOf(current);
      return { self: ladder[Math.min(idx + 1, ladder.length - 1)], opp, gameWon: false };
    }

    // Regular (with Advantage)
    if (current === "Ad") {
      return { self: 0, opp: 0, gameWon: true };
    }
    if (current === 40 && opp === "Ad") {
      // Remove opponent's advantage
      return { self: 40, opp: 40, gameWon: false };
    }
    if (current === 40 && opp === 40) {
      return { self: "Ad", opp: 40, gameWon: false };
    }
    if (current === 40) {
      return { self: 0, opp: 0, gameWon: true };
    }
    const ladder: Point[] = [0, 15, 30, 40];
    const idx = ladder.indexOf(current);
    return { self: ladder[Math.min(idx + 1, ladder.length - 1)], opp, gameWon: false };
  }

  async function incrementPoint(side: Side) {
    const s = state!;
    const { self, opp, gameWon } = nextPoint(s.points[side], s.points[other[side]], s.meta.goldenPoint);

    if (gameWon) {
      await update(courtRef, {
        points: { p1: 0, p2: 0 },
        games: { ...s.games, [side]: s.games[side] + 1 },
      });
    } else {
      await update(courtRef, {
        points: { ...s.points, [side]: self, [other[side]]: opp },
      });
    }
  }

  async function toggleGoldenPoint(on: boolean) {
    await update(ref(db, `courts/${courtId}/meta`), { goldenPoint: on });
  }

  // …Your existing UI, wired to incrementPoint/toggleGoldenPoint…
  return (
    <div className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{state.meta.name}</h1>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.meta.goldenPoint}
            onChange={(e) => toggleGoldenPoint(e.target.checked)}
          />
          <span>Golden point</span>
        </label>
      </div>

      {/* Example controls – replace with your real UI */}
      <div className="flex gap-4">
        <button className="px-3 py-2 rounded bg-blue-600" onClick={() => incrementPoint("p1")}>+ Point P1</button>
        <button className="px-3 py-2 rounded bg-pink-600" onClick={() => incrementPoint("p2")}>+ Point P2</button>
      </div>

      <pre className="bg-black/40 p-4 rounded">
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
}

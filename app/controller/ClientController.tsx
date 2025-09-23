// app/controller/ClientController.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set, update, type DatabaseReference } from "firebase/database";

/** ---------- Types (no goldenPoint) ---------- */
type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf }; // ← removed goldenPoint
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: Record<Side, number>;
};

const COURT_ID = "court1";
const COURT_PATH = `courts/${COURT_ID}`;

const DEFAULT: ScoreState = {
  meta: { name: "Court 1", bestOf: 3 },
  players: {
    "1a": { name: "P1A", cc: "my" },
    "1b": { name: "P1B", cc: "my" },
    "2a": { name: "P2A", cc: "my" },
    "2b": { name: "P2B", cc: "my" }
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets:  { p1: 0, p2: 0 }
};

/** ---------- Helpers (standard advantage rules only) ---------- */
function withDefaults(v: any): ScoreState {
  const s = v ?? {};
  return {
    meta: {
      name: s.meta?.name ?? DEFAULT.meta.name,
      bestOf: (s.meta?.bestOf as BestOf) ?? DEFAULT.meta.bestOf
    },
    players: {
      "1a": { name: s.players?.["1a"]?.name ?? "P1A", cc: s.players?.["1a"]?.cc ?? "my" },
      "1b": { name: s.players?.["1b"]?.name ?? "P1B", cc: s.players?.["1b"]?.cc ?? "my" },
      "2a": { name: s.players?.["2a"]?.name ?? "P2A", cc: s.players?.["2a"]?.cc ?? "my" },
      "2b": { name: s.players?.["2b"]?.name ?? "P2B", cc: s.players?.["2b"]?.cc ?? "my" }
    },
    points: { p1: s.points?.p1 ?? 0, p2: s.points?.p2 ?? 0 },
    games:  { p1: s.games?.p1  ?? 0, p2: s.games?.p2  ?? 0 },
    sets:   { p1: s.sets?.p1   ?? 0, p2: s.sets?.p2   ?? 0 }
  };
}

const ladder: Point[] = [0, 15, 30, 40];
const other: Record<Side, Side> = { p1: "p2", p2: "p1" };

function nextPoint(cur: Point, opp: Point) {
  if (cur === "Ad") return { self: 0 as Point, opp: 0 as Point, gameWon: true };
  if (cur === 40 && opp === "Ad") return { self: 40 as Point, opp: 40 as Point, gameWon: false };
  if (cur === 40 && opp === 40) return { self: "Ad" as Point, opp: 40 as Point, gameWon: false };
  if (cur === 40) return { self: 0 as Point, opp: 0 as Point, gameWon: true };
  const i = ladder.indexOf(cur);
  return { self: ladder[Math.min(i + 1, 3)], opp, gameWon: false };
}

/** ---------- Component ---------- */
export default function ClientController() {
  const [state, setState] = useState<ScoreState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const courtRef: DatabaseReference | null = useMemo(
    () => (db ? ref(db, COURT_PATH) : null),
    [db]
  );

  useEffect(() => {
    if (!db || !courtRef) {
      setErr("Firebase not initialized (check env vars and lib/firebase.client.ts).");
      return;
    }
    ensureAnonLogin().catch((e) => setErr(`Auth error: ${String(e)}`));

    const off = onValue(
      courtRef,
      async (snap) => {
        // one-time cleanup: remove meta/goldenPoint if it exists
        if (snap.val()?.meta?.goldenPoint !== undefined) {
          await update(ref(db, `${COURT_PATH}/meta`), { goldenPoint: null });
        }
        setState(withDefaults(snap.val()));
      },
      (e) => setErr(`Database error: ${String(e)}`)
    );
    return () => off();
  }, [courtRef, db]);

  async function inc(side: Side) {
    if (!courtRef || !state) return;
    const cur = state.points[side];
    const opp = state.points[other[side]];
    const n = nextPoint(cur, opp);
    if (n.gameWon) {
      await update(courtRef, {
        points: { p1: 0, p2: 0 },
        games:  { ...state.games, [side]: state.games[side] + 1 }
      });
    } else {
      await update(courtRef, {
        points: { ...state.points, [side]: n.self, [other[side]]: n.opp }
      });
    }
  }

  async function resetGame() {
    if (!courtRef) return;
    await update(courtRef, { points: { p1: 0, p2: 0 } });
  }

  async function newMatch() {
    if (!courtRef) return;
    await set(courtRef, DEFAULT);
  }

  async function swapSides() {
    if (!courtRef || !state) return;
    await update(courtRef, {
      players: {
        "1a": state.players["2a"],
        "1b": state.players["2b"],
        "2a": state.players["1a"],
        "2b": state.players["1b"]
      },
      points: { p1: state.points.p2, p2: state.points.p1 },
      games:  { p1: state.games.p2,  p2: state.games.p1 },
      sets:   { p1: state.sets.p2,   p2: state.sets.p1 }
    });
  }

  if (err) return <div className="p-4 text-red-200 bg-red-900/40 rounded">{err}</div>;
  if (!state) return <div className="p-6 text-white">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{state.meta.name}</h1>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600" onClick={swapSides}>
            Swap sides
          </button>
          <button className="px-3 py-2 rounded bg-amber-700 hover:bg-amber-600" onClick={resetGame}>
            Reset game
          </button>
          <button className="px-3 py-2 rounded bg-rose-700 hover:bg-rose-600" onClick={newMatch}>
            New match
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Team title="Team 1" a={state.players["1a"]} b={state.players["1b"]} games={state.games.p1} sets={state.sets.p1} points={state.points.p1} />
        <Team title="Team 2" a={state.players["2a"]} b={state.players["2b"]} games={state.games.p2} sets={state.sets.p2} points={state.points.p2} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500" onClick={() => inc("p1")}>
          + Point P1
        </button>
        <button className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-500" onClick={() => inc("p2")}>
          + Point P2
        </button>
      </div>
    </div>
  );
}

function Team(props: { title: string; a: Player; b: Player; games: number; sets: number; points: Point }) {
  const { title, a, b, games, sets, points } = props;
  return (
    <div className="rounded-2xl bg-white/5 p-4 shadow ring-1 ring-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="text-sm opacity-80">Sets {sets} • Games {games} • Points {String(points)}</div>
      </div>
      <div className="text-sm opacity-90">{a.name} / {b.name}</div>
    </div>
  );
}

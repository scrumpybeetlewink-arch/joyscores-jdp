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
const COURT_PATH = `courts/${COURT_ID}`;

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

/** ---------- Helpers ---------- */
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

const ladder: Point[] = [0, 15, 30, 40];
const other: Record<Side, Side> = { p1: "p2", p2: "p1" };

function nextPoint(cur: Point, opp: Point, golden: boolean) {
  if (golden) {
    if (cur === 40) return { self: 0 as Point, opp: 0 as Point, gameWon: true };
    const i = ladder.indexOf(cur);
    return { self: ladder[Math.min(i + 1, 3)], opp, gameWon: false };
  }
  if (cur === "Ad") return { self: 0 as Point, opp: 0 as Point, gameWon: true };
  if (cur === 40 && opp === "Ad") return { self: 40 as Point, opp: 40 as Point, gameWon: false };
  if (cur === 40 && opp === 40) return { self: "Ad" as Point, opp: 40 as Point, gameWon: false };
  if (cur === 40) return { self: 0 as Point, opp: 0 as Point, gameWon: true };
  const i = ladder.indexOf(cur);
  return { self: ladder[Math.min(i + 1, 3)], opp, gameWon: false };
}

/** ---------- Page ---------- */
export default function ControllerPage() {
  const [state, setState] = useState<ScoreState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const courtRef: DatabaseReference | null = useMemo(
    () => (db ? ref(db, COURT_PATH) : null),
    [db]
  );

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
    if (!db) return;
    await update(ref(db, `${COURT_PATH}/meta`), { goldenPoint: on });
  }

  async function inc(side: Side) {
    if (!courtRef || !state) return;
    const cur = state.points[side];
    const opp = state.points[other[side]];
    const n = nextPoint(cur, opp, state.meta.goldenPoint);
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

  async function decPoint(side: Side) {
    if (!courtRef || !state) return;
    // simple undo: reset both to 0 (so you can replay); customize as needed
    await update(courtRef, { points: { p1: 0, p2: 0 } });
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
        "2b": state.players["1b"],
      },
      points: { p1: state.points.p2, p2: state.points.p1 },
      games: { p1: state.games.p2, p2: state.games.p1 },
      sets: { p1: state.sets.p2, p2: state.sets.p1 },
    });
  }

  async function editPlayer(key: "1a" | "1b" | "2a" | "2b", field: "name" | "cc", value: string) {
    if (!db || !state) return;
    const next = { ...state.players[key], [field]: value };
    await update(ref(db, `${COURT_PATH}/players/${key}`), next);
  }

  if (err) return <div className="p-4 text-red-200 bg-red-900/40 rounded">{err}</div>;
  if (!state) return <div className="p-6 text-white">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl p-6 text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{state.meta.name}</h1>
        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.meta.goldenPoint}
              onChange={(e) => setGoldenPoint(e.target.checked)}
            />
            <span>Golden point</span>
          </label>
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
      </div>

      {/* Players editor */}
      <div className="grid grid-cols-2 gap-6">
        <TeamCard
          title="Team 1"
          a={state.players["1a"]}
          b={state.players["1b"]}
          games={state.games.p1}
          sets={state.sets.p1}
          points={state.points.p1}
          onChange={(slot, field, v) => editPlayer(slot as any, field, v)}
          slots={["1a", "1b"]}
        />
        <TeamCard
          title="Team 2"
          a={state.players["2a"]}
          b={state.players["2b"]}
          games={state.games.p2}
          sets={state.sets.p2}
          points={state.points.p2}
          onChange={(slot, field, v) => editPlayer(slot as any, field, v)}
          slots={["2a", "2b"]}
        />
      </div>

      {/* Scoring controls */}
      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500" onClick={() => inc("p1")}>
          + Point P1
        </button>
        <button className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-500" onClick={() => inc("p2")}>
          + Point P2
        </button>
        <button className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600" onClick={() => decPoint("p1")}>
          Undo last (simple)
        </button>
      </div>
    </div>
  );
}

/** ---------- UI bits ---------- */
function TeamCard(props: {
  title: string;
  a: Player;
  b: Player;
  games: number;
  sets: number;
  points: Point;
  onChange: (slot: "1a" | "1b" | "2a" | "2b", field: "name" | "cc", v: string) => void;
  slots: ("1a" | "1b" | "2a" | "2b")[];
}) {
  const { title, a, b, games, sets, points, onChange, slots } = props;
  return (
    <div className="rounded-2xl bg-white/5 p-4 shadow ring-1 ring-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="text-sm opacity-80">Sets {sets} • Games {games} • Points {String(points)}</div>
      </div>

      {([a, b] as Player[]).map((p, i) => {
        const slot = slots[i];
        return (
          <div key={slot} className="grid grid-cols-5 gap-2 items-center mb-2">
            <label className="col-span-1 text-sm opacity-80">{slot.toUpperCase()}</label>
            <input
              className="col-span-3 bg-white/10 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-sky-500"
              value={p.name}
              onChange={(e) => onChange(slot, "name", e.target.value)}
              placeholder="Player name"
            />
            <input
              className="col-span-1 bg-white/10 rounded px-2 py-1 text-center uppercase outline-none focus:ring-2 focus:ring-sky-500"
              value={p.cc}
              onChange={(e) => onChange(slot, "cc", e.target.value.toLowerCase())}
              placeholder="cc"
              maxLength={3}
            />
          </div>
        );
      })}
    </div>
  );
}

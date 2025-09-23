// app/controller/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, update, set, type DatabaseReference } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: Record<Side, number>;
};

const COURT_PATH = `courts/court1`;

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

function withDefaults(v: any): ScoreState {
  const s = v ?? {};
  const players = s.players ?? {};
  return {
    meta: {
      name: s.meta?.name ?? DEFAULT.meta.name,
      bestOf: (s.meta?.bestOf as BestOf) ?? DEFAULT.meta.bestOf,
    },
    players: {
      "1a": { name: players["1a"]?.name ?? "P1A", cc: players["1a"]?.cc ?? "my" },
      "1b": { name: players["1b"]?.name ?? "P1B", cc: players["1b"]?.cc ?? "my" },
      "2a": { name: players["2a"]?.name ?? "P2A", cc: players["2a"]?.cc ?? "my" },
      "2b": { name: players["2b"]?.name ?? "P2B", cc: players["2b"]?.cc ?? "my" },
    },
    points: {
      p1: (s.points?.p1 ?? 0) as Point,
      p2: (s.points?.p2 ?? 0) as Point,
    },
    games: {
      p1: s.games?.p1 ?? 0,
      p2: s.games?.p2 ?? 0,
    },
    sets: {
      p1: s.sets?.p1 ?? 0,
      p2: s.sets?.p2 ?? 0,
    },
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

export default function ControllerPage() {
  const [state, setState] = useState<ScoreState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const courtRef: DatabaseReference | null = useMemo(
    () => (db ? ref(db, COURT_PATH) : null),
    [db]
  );

  useEffect(() => {
    if (!db || !courtRef) {
      setErr("Firebase not initialized. Check NEXT_PUBLIC_* env vars.");
      return;
    }
    ensureAnonLogin().catch((e) => console.warn("anon auth failed:", e));

    const off = onValue(
      courtRef,
      async (snap) => {
        if (!snap.exists()) {
          await set(courtRef, DEFAULT);
          setState(DEFAULT);
          return;
        }
        // Merge defaults so UI never sees undefined
        const merged = withDefaults(snap.val());

        // One-time repair if any essential branches are missing
        const missing: any = {};
        if (!snap.val()?.points) missing.points = DEFAULT.points;
        if (!snap.val()?.games)  missing.games  = DEFAULT.games;
        if (!snap.val()?.sets)   missing.sets   = DEFAULT.sets;
        if (Object.keys(missing).length) {
          try { await update(courtRef, missing); } catch {}
        }

        setState(merged);
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
        games: { ...state.games, [side]: state.games[side] + 1 },
      });
    } else {
      await update(courtRef, {
        points: { ...state.points, [side]: n.self, [other[side]]: n.opp },
      });
    }
  }

  async function resetGame() {
    if (courtRef) await update(courtRef, { points: { p1: 0, p2: 0 } });
  }
  async function newMatch() {
    if (courtRef) await set(courtRef, DEFAULT);
  }

  if (err) return <div style={{ padding: 24, color: "#fecaca" }}>{err}</div>;
  if (!state) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{state.meta.name}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Team
          title="Team 1"
          a={state.players["1a"]}
          b={state.players["1b"]}
          games={state.games.p1}
          sets={state.sets.p1}
          points={state.points.p1}
        />
        <Team
          title="Team 2"
          a={state.players["2a"]}
          b={state.players["2b"]}
          games={state.games.p2}
          sets={state.sets.p2}
          points={state.points.p2}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => inc("p1")} style={{ padding: "8px 12px" }}>+ Point P1</button>
        <button onClick={() => inc("p2")} style={{ padding: "8px 12px" }}>+ Point P2</button>
        <button onClick={resetGame} style={{ padding: "8px 12px", marginLeft: "auto" }}>Reset game</button>
        <button onClick={newMatch} style={{ padding: "8px 12px" }}>New match</button>
      </div>
    </main>
  );
}

function Team(props: {
  title: string;
  a: Player;
  b: Player;
  games: number;
  sets: number;
  points: Point;
}) {
  const { title, a, b, games, sets, points } = props;
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{title}</strong>
        <span style={{ opacity: .8 }}>Sets {sets} • Games {games} • Points {String(points)}</span>
      </div>
      <div style={{ opacity: .9 }}>{a.name} / {b.name}</div>
    </div>
  );
}

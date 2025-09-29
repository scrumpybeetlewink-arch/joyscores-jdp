"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

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
  ts: undefined,
};

export default function ControllerPage() {
  const params = useSearchParams();
  const court = params.get("court") || "court1";
  const COURT_PATH = `/courts/${court}`;

  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        await ensureAnonLogin();
      } catch {}
      unsub = onValue(ref(db, COURT_PATH), (snap) => {
        setS(snap.val() || defaultState);
      });
    })();
    return () => unsub();
  }, [court]);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function addPoint(side: Side, dir: 1 | -1) {
    const n = clone();
    if (dir === 1) {
      n.points[side] = 15;
    } else {
      n.points[side] = 0;
    }
    commit(n);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#212A31", color: "#fff" }}>
      <h1 style={{ padding: 16, fontWeight: 800 }}>{court.toUpperCase()}</h1>
      <pre style={{ padding: 16 }}>{JSON.stringify(s, null, 2)}</pre>
      <div style={{ display: "flex", gap: 8, padding: 16 }}>
        <button onClick={() => addPoint("p1", +1)}>+ P1</button>
        <button onClick={() => addPoint("p2", +1)}>+ P2</button>
      </div>
    </main>
  );
}

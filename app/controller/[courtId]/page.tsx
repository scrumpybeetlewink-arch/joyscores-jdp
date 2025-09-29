"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
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
  server: Side;
};

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: {
    "1a": { name: "", cc: "🏳️" },
    "1b": { name: "", cc: "🏳️" },
    "2a": { name: "", cc: "🏳️" },
    "2b": { name: "", cc: "🏳️" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  server: "p1",
};

export default function ControllerPage() {
  const { courtId } = useParams<{ courtId: string }>();
  const path = `/courts/${courtId}`;
  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, path), snap => setS(snap.val() ?? defaultState));
    })();
    return () => unsub();
  }, [path]);

  async function commit(next: ScoreState) { await set(ref(db, path), next); }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function addPoint(side: Side) {
    const n = clone();
    n.points[side] = n.points[side] === 0 ? 15 :
                     n.points[side] === 15 ? 30 :
                     n.points[side] === 30 ? 40 : "Ad";
    commit(n);
  }

  function reset() { commit(defaultState); }

  return (
    <main style={{ minHeight: "100vh", background: "#212A31", color: "#fff", padding: 20 }}>
      <h1 style={{ fontSize: "1.5em", marginBottom: 20 }}>Controller – {courtId}</h1>
      <div style={{ display: "grid", gap: 20 }}>
        <button onClick={() => addPoint("p1")} style={{ padding: 12, borderRadius: 8, background: "#124E66", color: "#fff" }}>+ Point Team 1</button>
        <button onClick={() => addPoint("p2")} style={{ padding: 12, borderRadius: 8, background: "#124E66", color: "#fff" }}>+ Point Team 2</button>
        <button onClick={reset} style={{ padding: 12, borderRadius: 8, background: "#8b2e2e", color: "#fff" }}>Reset</button>
      </div>
      <pre style={{ marginTop: 20, background: "#0B1B2B", padding: 12, borderRadius: 8 }}>
        {JSON.stringify(s, null, 2)}
      </pre>
    </main>
  );
}

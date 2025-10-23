
"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, off, update } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf; golden?: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  tiebreak: boolean;
  tb: Record<Side, number>;
  server: Side;
  ts: number;
};

export default function ControllerClient({ courtId }: { courtId: "court1"|"court2"|"court3"|"court4"|"court5" }) {
  const [state, setState] = useState<ScoreState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { ensureAnonLogin(); }, []);

  useEffect(() => {
    const base = ref(db, `courts/${courtId}`);
    const unsub = onValue(
      base,
      (snap) => {
        setError(null);
        const val = snap.val();
        if (val) {
          (val as any).sets ||= { p1: [], p2: [] };
          (val as any).tb ||= { p1: 0, p2: 0 };
          setState(val as ScoreState);
        } else {
          setState(null);
        }
      },
      (err) => {
        console.error("RTDB onValue error:", err);
        setError(err?.message || "Permission denied or network error");
        setState(null);
      }
    );
    return () => off(base);
  }, [courtId]);

  function write(partial: Partial<ScoreState>) {
    return update(ref(db, `courts/${courtId}`), { ...partial, ts: Date.now() });
  }

  function toggleGolden() {
    if (!state) return;
    const nextMeta: ScoreState["meta"] = { ...state.meta, golden: !state.meta?.golden };
    write({ meta: nextMeta });
  }

  function setServer(side: Side) {
    write({ server: side } as Partial<ScoreState>);
  }

  function point(side: Side, delta: 1 | -1) {
    if (!state) return;
    const order: Point[] = [0, 15, 30, 40, "Ad"];
    const idx = order.indexOf(state.points[side]);
    const nextIdx = delta === 1 ? Math.min(idx + 1, order.length - 1) : Math.max(idx - 1, 0);
    const nextPoints: ScoreState["points"] = { ...state.points, [side]: order[nextIdx] };
    write({ points: nextPoints });
  }

  if (error) return <div style={{ padding: 16, color: "#f88" }}>Error: {error}</div>;
  if (!state) return <div style={{ padding: 16 }}>Loading… (no data yet)</div>;

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Controller — {state.meta?.name} ({courtId})</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={toggleGolden}>Golden: {String(state.meta?.golden ?? false)}</button>
        <button onClick={() => setServer("p1")}>Server → p1</button>
        <button onClick={() => setServer("p2")}>Server → p2</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
        <div>{state.players["1a"]?.cc} {state.players["1a"]?.name} & {state.players["1b"]?.name}</div>
        <div>Games: {state.games.p1}</div>
        <div>Points: {String(state.points.p1)}</div>

        <div>{state.players["2a"]?.cc} {state.players["2a"]?.name} & {state.players["2b"]?.name}</div>
        <div>Games: {state.games.p2}</div>
        <div>Points: {String(state.points.p2)}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => point("p1", +1)}>+ Point p1</button>
        <button onClick={() => point("p1", -1)}>- Point p1</button>
        <button onClick={() => point("p2", +1)}>+ Point p2</button>
        <button onClick={() => point("p2", -1)}>- Point p2</button>
      </div>
    </div>
  );
}

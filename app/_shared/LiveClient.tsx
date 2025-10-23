"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, off } from "firebase/database";

type Side = "p1" | "p2";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf; golden?: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, number | "Ad">;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  tiebreak: boolean;
  tb: Record<Side, number>;
  server: Side;
  ts: number;
};

export default function LiveClient({ courtId }: { courtId: "court1"|"court2"|"court3"|"court4"|"court5" }) {
  const [state, setState] = useState<ScoreState | null>(null);

  useEffect(() => { ensureAnonLogin(); }, []);

  useEffect(() => {
    const base = ref(db, `courts/${courtId}`);
    const unsub = onValue(base, (snap) => setState(snap.val() as ScoreState));
    return () => off(base);
  }, [courtId]);

  if (!state) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>{state.meta?.name} — {courtId}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
        <div>{state.players["1a"]?.cc} {state.players["1a"]?.name} & {state.players["1b"]?.name}</div>
        <div>Games: {state.games.p1}</div>
        <div>Points: {String(state.points.p1)}</div>

        <div>{state.players["2a"]?.cc} {state.players["2a"]?.name} & {state.players["2b"]?.name}</div>
        <div>Games: {state.games.p2}</div>
        <div>Points: {String(state.points.p2)}</div>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        Golden point: {String(state.meta?.golden ?? false)} • Server: {state.server}
      </div>
    </div>
  );
}

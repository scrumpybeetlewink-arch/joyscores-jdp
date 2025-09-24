// @ts-nocheck
"use client";

export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

/** ---------- Types ---------- */
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

function normalize(v: any): ScoreState {
  if (!v) return defaultState;
  return {
    ...defaultState,
    ...v,
    meta: { name: v?.meta?.name ?? "", bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf },
  };
}

export default function LivePage() {
  const defaultPath = "/joyscores/court1";
  const [path] = useState<string>(defaultPath);
  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, path), (snap) => setS(normalize(snap.val())));
    })();
    return () => unsub?.();
  }, [path]);

  const maxSets = useMemo(() => (s?.meta?.bestOf===5?5:3), [s?.meta?.bestOf]);

  const Row = ({ side }: { side: Side }) => {
    const players = s.players, sets = s.sets, games = s.games;
    const p1a = players["1a"].name || "Player 1";
    const p1b = players["1b"].name || "Player 2";
    const p2a = players["2a"].name || "Player 3";
    const p2b = players["2b"].name || "Player 4";
    const line = side==="p1"?`${players["1a"].cc} ${p1a} / ${players["1b"].cc} ${p1b}`:`${players["2a"].cc} ${p2a} / ${players["2b"].cc} ${p2b}`;
    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({length:maxSets}).map((_,i)=> i<finished ? (side==="p1"?sets.p1[i]??"":sets

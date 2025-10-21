"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

function resolveCourtIdFromLocation(defaultId: string = "court1") {
  if (typeof window === "undefined") return defaultId;
  try {
    const q = new URLSearchParams(window.location.search).get("court");
    if (q && /^court[1-5]$/i.test(q)) return q.toLowerCase();
  } catch {}
  return defaultId;
}

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
  golden: boolean;
};

export default function LivePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  ensureAnonLogin();

  const [courtId, setCourtId] = useState<string>(() => resolveCourtIdFromLocation());
  useEffect(() => { setCourtId(resolveCourtIdFromLocation()); }, []);

  const COURT_PATH = `/courts/${courtId}`;

  const [state, setState] = useState<ScoreState | null>(null);
  useEffect(() => {
    const r = ref(db, `${COURT_PATH}/score`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      if (v) setState(v);
    });
    return () => unsub();
  }, [COURT_PATH, courtId]);

  if (!state) return <div className="p-4 text-slate-400">Loading…</div>;

  const { players, points, games, sets, meta, server, golden } = state;

  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="w-full max-w-2xl p-6">
        <h1 className="text-center text-2xl font-extrabold mb-4">{meta?.name || courtId}</h1>

        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <div className="text-lg font-semibold">
              {players["1a"]?.name} &amp; {players["1b"]?.name}
            </div>
            <div className="text-slate-300 text-sm mt-1">
              Sets: {sets.p1.join(" ")} | Games: {games.p1} | Points: {points.p1}
            </div>
            {server === "p1" && <div className="text-yellow-300 text-xs mt-1">● Serving</div>}
          </div>
          <div>
            <div className="text-lg font-semibold">
              {players["2a"]?.name} &amp; {players["2b"]?.name}
            </div>
            <div className="text-slate-300 text-sm mt-1">
              Sets: {sets.p2.join(" ")} | Games: {games.p2} | Points: {points.p2}
            </div>
            {server === "p2" && <div className="text-yellow-300 text-xs mt-1">● Serving</div>}
          </div>
        </div>

        {golden && <div className="mt-5 text-center text-rose-400 font-bold">GOLDEN POINT</div>}
      </div>
    </main>
  );
}

// app/live/page.tsx
"use client";

import { useEffect, useState , useEffect, useState} from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";
import { useCourtId } from "@/app/shared/useCourtId";
import { getCourtId } from "@/app/shared/getCourtId";

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
  const [courtId, setCourtId] = useState<"court1"|"court2"|"court3"|"court4"|"court5">("court1");
  useEffect(() => { setCourtId(getCourtId()); }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { ensureAnonLogin(); }, []);
  if (!mounted) return null;

  const court = useCourtId("court1");
  const COURT_PATH = `/courts/${court}`;

  const [state, setState] = useState<ScoreState | null>(null);
  useEffect(() => {
    const r = ref(db, `${COURT_PATH}/score`);
    const unsub = onValue(r, (snap) => setState(snap.val() || null));
    return () => unsub();
  }, [COURT_PATH, court]);

  if (!state) return <div className="p-4 text-slate-400">Loading…</div>;

  const sets = state.sets ?? { p1: [], p2: [] };
  const games = state.games ?? { p1: 0, p2: 0 };
  const points = state.points ?? { p1: 0 as Point, p2: 0 as Point };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="w-full max-w-2xl p-6">
        <h1 className="text-center text-2xl font-extrabold mb-4">{state.meta?.name || court}</h1>

        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <div className="text-lg font-semibold">
              {state.players?.["1a"]?.name ?? "P1A"} &amp; {state.players?.["1b"]?.name ?? "P1B"}
            </div>
            <div className="text-slate-300 text-sm mt-1">
              Sets: {(sets.p1 || []).join(" ")} | Games: {games.p1 ?? 0} | Points: {String(points.p1 ?? 0)}
            </div>
            {state.server === "p1" && <div className="text-yellow-300 text-xs mt-1">● Serving</div>}
          </div>
          <div>
            <div className="text-lg font-semibold">
              {state.players?.["2a"]?.name ?? "P2A"} &amp; {state.players?.["2b"]?.name ?? "P2B"}
            </div>
            <div className="text-slate-300 text-sm mt-1">
              Sets: {(sets.p2 || []).join(" ")} | Games: {games.p2 ?? 0} | Points: {String(points.p2 ?? 0)}
            </div>
            {state.server === "p2" && <div className="text-yellow-300 text-xs mt-1">● Serving</div>}
          </div>
        </div>

        {state.golden && <div className="mt-5 text-center text-rose-400 font-bold">GOLDEN POINT</div>}
      </div>
    </main>
  );
}
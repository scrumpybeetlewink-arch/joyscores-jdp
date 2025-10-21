// app/controller/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set, update } from "firebase/database";
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

export default function ControllerPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { ensureAnonLogin(); }, []);
  if (!mounted) return null;

  const court = useCourtId("court1");
  const COURT_PATH = `/courts/${court}`;

  const [state, setState] = useState<ScoreState | null>(null);
  useEffect(() => {
    const r = ref(db, `${COURT_PATH}/score`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      if (v) setState(v as ScoreState);
      else {
        const init: ScoreState = {
          meta: { name: court, bestOf: 3 },
          players: { "1a": { name: "P1A", cc: "" }, "1b": { name: "P1B", cc: "" }, "2a": { name: "P2A", cc: "" }, "2b": { name: "P2B", cc: "" } },
          points: { p1: 0, p2: 0 },
          games: { p1: 0, p2: 0 },
          sets: { p1: [], p2: [] },
          server: "p1",
          golden: false,
        };
        set(r, init);
        setState(init);
      }
    });
    return () => unsub();
  }, [COURT_PATH, court]);

  if (!state) return <div className="p-4 text-slate-400">Loading…</div>;

  const bumpPoint = (who: Side) => {
    const order: Point[] = [0, 15, 30, 40, "Ad"];
    const cur = state.points?.[who] ?? 0;
    const idx = Math.max(0, order.indexOf(cur));
    const next = order[Math.min(idx + 1, order.length - 1)];
    update(ref(db, `${COURT_PATH}/score/points`), { [who]: next as any });
  };

  const toggleGolden = () => update(ref(db, `${COURT_PATH}/score`), { golden: !state.golden });

  // ⬇️ keep your spacing/theme — only the data plumbing changed
  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="w-full max-w-3xl p-6">
        <h1 className="text-center text-2xl font-extrabold mb-4">{state.meta?.name || court}</h1>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => bumpPoint("p1")} className="px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-bold">+ Point P1</button>
          <button onClick={() => bumpPoint("p2")} className="px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-bold">+ Point P2</button>
        </div>

        <div className="flex gap-3 justify-center mt-5">
          <button onClick={toggleGolden} className={`px-4 py-3 rounded-xl font-bold ${state.golden ? "bg-rose-600" : "bg-slate-600 hover:bg-slate-500"}`}>
            {state.golden ? "Golden ON" : "Golden OFF"}
          </button>
          <a href={`/live/?court=${court}`} className="px-4 py-3 rounded-xl bg-sky-800 hover:bg-sky-700 font-bold">Open Live</a>
        </div>
      </div>
    </main>
  );
}
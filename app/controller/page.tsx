"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, update, set } from "firebase/database";

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

function ControllerInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  ensureAnonLogin();

  const [courtId, setCourtId] = useState<string>(() => resolveCourtIdFromLocation());
  useEffect(() => { setCourtId(resolveCourtIdFromLocation()); }, []);

  const COURT_PATH = `/courts/${courtId}`;
  const META_NAME_PATH = `/courts/${courtId}/meta/name`;

  const [state, setState] = useState<ScoreState | null>(null);
  useEffect(() => {
    const scoreRef = ref(db, `${COURT_PATH}/score`);
    const unsub = onValue(scoreRef, (snap) => {
      const v = snap.val();
      if (v) setState(v);
      else {
        const init: ScoreState = {
          meta: { name: courtId, bestOf: 3 },
          players: {
            "1a": { name: "P1A", cc: "" },
            "1b": { name: "P1B", cc: "" },
            "2a": { name: "P2A", cc: "" },
            "2b": { name: "P2B", cc: "" }
          },
          points: { p1: 0, p2: 0 },
          games: { p1: 0, p2: 0 },
          sets: { p1: [], p2: [] },
          server: "p1",
          golden: false
        };
        set(ref(db, `${COURT_PATH}/score`), init);
        setState(init);
      }
    });
    return () => unsub();
  }, [COURT_PATH, courtId]);

  if (!state) return <div style={{ padding: 16, color: "#9aa7b0" }}>Loading…</div>;

  const bumpPoint = (who: Side) => {
    const order: Point[] = [0, 15, 30, 40, "Ad"];
    const cur = state.points[who];
    const idx = order.indexOf(cur);
    const next = order[Math.min(idx + 1, order.length - 1)];
    update(ref(db, `${COURT_PATH}/score/points`), { [who]: next as any });
  };

  const toggleGolden = () => {
    update(ref(db, `${COURT_PATH}/score`), { golden: !state.golden });
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="w-full max-w-3xl p-6">
        <h1 className="text-center text-2xl font-extrabold mb-4">{state.meta?.name || courtId}</h1>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => bumpPoint("p1")} className="px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-bold">+ Point P1</button>
          <button onClick={() => bumpPoint("p2")} className="px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-bold">+ Point P2</button>
        </div>

        <div className="flex gap-3 justify-center mt-5">
          <button onClick={toggleGolden} className={`px-4 py-3 rounded-xl font-bold ${state.golden ? "bg-rose-600" : "bg-slate-600 hover:bg-slate-500"}`}>
            {state.golden ? "Golden ON" : "Golden OFF"}
          </button>
          <a href={`/live/?court=${courtId}`} className="px-4 py-3 rounded-xl bg-sky-800 hover:bg-sky-700 font-bold">Open Live</a>
        </div>
      </div>
    </main>
  );
}

export default function ControllerPage() {
  return <ControllerInner />;
}

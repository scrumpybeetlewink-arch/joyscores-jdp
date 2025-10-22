"use client";

import React, { Suspense, useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, update, remove } from "firebase/database";
import { getCourtId } from "@/app/shared/getCourtId";

export default function ControllerPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); ensureAnonLogin(); }, []);
  if (!mounted) return null;

  return (
    <Suspense fallback={<main style={{ padding: 24, color: "#fff" }}>Loading…</main>}>
      <ControllerInner />
    </Suspense>
  );
}

function ControllerInner() {
  const [courtId, setCourtId] =
    useState<"court1"|"court2"|"court3"|"court4"|"court5">("court1");
  useEffect(() => { setCourtId(getCourtId()); }, []);

  const COURT_PATH = `/courts/${courtId}`;
  const SCORE_PATH = `${COURT_PATH}/score`;

  const [score, setScore] = useState<{p1:number;p2:number}>({p1:0,p2:0});
  useEffect(() => {
    const off = onValue(ref(db, SCORE_PATH), (snap) => {
      const v = snap.val();
      setScore({ p1: v?.p1 || 0, p2: v?.p2 || 0 });
    });
    return () => off();
  }, [SCORE_PATH]);

  const inc = async (k:"p1"|"p2") => update(ref(db, SCORE_PATH), { [k]: (score[k]||0)+1 });
  const dec = async (k:"p1"|"p2") => update(ref(db, SCORE_PATH), { [k]: Math.max(0, (score[k]||0)-1) });
  const reset = async () => remove(ref(db, COURT_PATH));

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-xl font-bold mb-6">Controller — {courtId.toUpperCase()}</h1>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="rounded-xl border border-slate-700 p-4">
          <div className="font-bold mb-2">Player 1</div>
          <div className="flex gap-2">
            <button onClick={() => dec("p1")} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600">-</button>
            <button onClick={() => inc("p1")} className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600">+</button>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 p-4">
          <div className="font-bold mb-2">Player 2</div>
          <div className="flex gap-2">
            <button onClick={() => dec("p2")} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600">-</button>
            <button onClick={() => inc("p2")} className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600">+</button>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <button onClick={reset} className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-600">Reset Court</button>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

const COURTS = ["court1","court2","court3","court4","court5"] as const;
type CourtId = typeof COURTS[number];

export default function IndexPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); ensureAnonLogin(); }, []);
  if (!mounted) return null;

  const [names, setNames] = useState<Record<CourtId, string>>({
    court1: "Court 1",
    court2: "Court 2",
    court3: "Court 3",
    court4: "Court 4",
    court5: "Court 5",
  });

  // Subscribe to each court name
  useEffect(() => {
    const unsubs = COURTS.map((c) => {
      const r = ref(db, `courts/${c}/score/meta/name`);
      return onValue(r, (snap) => {
        const v = snap.val();
        setNames((prev) => ({ ...prev, [c]: typeof v === "string" && v.trim() ? v : prev[c] }));
      });
    });
    return () => unsubs.forEach((u) => (typeof u === "function" ? u() : undefined));
  }, []);

  const [selected, setSelected] = useState<CourtId>("court1");

  const saveName = async (c: CourtId, value: string) => {
    const next = value.trim() || c;
    await set(ref(db, `courts/${c}/score/meta/name`), next);
    // Optimistic local update
    setNames((prev) => ({ ...prev, [c]: next }));
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Courts</h1>

          {/* Dropdown pill */}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as CourtId)}
            className="appearance-none bg-slate-800 border border-slate-700 rounded-full px-4 py-2 pr-8 font-semibold"
          >
            {COURTS.map((c) => (
              <option key={c} value={c}>{names[c]}</option>
            ))}
          </select>
        </header>

        {/* Open selected court */}
        <div className="flex gap-3 mb-8">
          <Link href={`/controller/?court=${selected}`} className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-bold">Open Controller</Link>
          <Link href={`/live/?court=${selected}`} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold">Open Live</Link>
        </div>

        {/* Editable tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {COURTS.map((c) => (
            <div key={c} className="rounded-xl border border-slate-700 p-4">
              <label className="block text-xs uppercase opacity-70 mb-1">{c}</label>
              <input
                defaultValue={names[c]}
                onBlur={(e) => saveName(c, e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 mb-3"
              />
              <div className="flex gap-2">
                <Link href={`/controller/?court=${c}`} className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 font-bold">Controller</Link>
                <Link href={`/live/?court=${c}`} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold">Live</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

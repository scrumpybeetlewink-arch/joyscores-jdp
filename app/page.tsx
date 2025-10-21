"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set, remove } from "firebase/database";

const COURTS = ["court1","court2","court3","court4","court5"] as const;
type CourtId = typeof COURTS[number];

export default function IndexPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); ensureAnonLogin(); }, []);
  if (!mounted) return null;

  const [names, setNames] = useState<Record<CourtId, string>>({
    court1: "Court 1", court2: "Court 2", court3: "Court 3", court4: "Court 4", court5: "Court 5",
  });

  useEffect(() => {
    const offs = COURTS.map((c) =>
      onValue(ref(db, `courts/${c}/score/meta/name`), (snap) => {
        const v = snap.val();
        if (typeof v === "string" && v.trim()) setNames((p) => ({ ...p, [c]: v }));
      })
    );
    return () => offs.forEach(off => { try { off(); } catch {} });
  }, []);

  async function save(c: CourtId, value: string) {
    const v = (value || c.replace("court","Court ")).trim();
    await set(ref(db, `courts/${c}/score/meta/name`), v);
    setNames(p => ({ ...p, [c]: v }));
  }

  async function reset(c: CourtId) {
    await remove(ref(db, `courts/${c}`));
    setNames(p => ({ ...p, [c]: c.replace("court","Court ") }));
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-6">Courts</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {COURTS.map((c) => (
            <div key={c} className="rounded-xl border border-slate-700 p-4">
              <div className="text-xs uppercase opacity-70 mb-1">{c}</div>
              <input
                defaultValue={names[c]}
                onBlur={(e) => save(c, e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 mb-3"
              />
              <div className="flex gap-2">
                <Link href={`/controller/?court=${c}`} className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 font-bold">Controller</Link>
                <Link href={`/live/?court=${c}`} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold">Live</Link>
                <button onClick={() => reset(c)} className="ml-auto px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-600">Reset</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

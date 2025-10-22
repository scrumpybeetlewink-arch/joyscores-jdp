"use client";
import Link from "next/link";
const COURTS = ["court1","court2","court3","court4","court5"];
export default function IndexPage(){
  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-2xl font-extrabold mb-6">Courts</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {COURTS.map(c => (
          <div key={c} className="rounded-xl border border-slate-700 p-4">
            <div className="mb-2 font-bold uppercase">{c}</div>
            <div className="flex gap-2">
              <Link href={`/controller/?court=${c}`} className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 font-bold">Controller</Link>
              <Link href={`/live/?court=${c}`} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold">Live</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

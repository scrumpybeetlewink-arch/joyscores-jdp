"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

export default function IndexPage() {
  const path = "courts/court1";
  const [courtName, setCourtName] = useState("Centre Court");

  useEffect(() => {
    ensureAnonLogin();
    const courtRef = ref(db, `${path}/meta/name`);
    return onValue(courtRef, (snap) => {
      if (snap.exists()) setCourtName(snap.val());
    });
  }, []);

  const saveName = () => set(ref(db, `${path}/meta/name`), courtName);
  const resetName = () => setCourtName("Centre Court");

  return (
    <main className="min-h-screen bg-[#121a21] text-[#e9edf3] grid place-items-center p-8">
      <section className="w-[min(900px,95vw)] bg-[#0E1B24] border border-white/10 rounded-2xl shadow-2xl p-8">
        <h1 className="text-center font-extrabold tracking-wide mb-6 text-3xl">
          {courtName.toUpperCase()}
        </h1>
        <label className="block opacity-80 mb-2">Court name</label>
        <input
          value={courtName}
          onChange={(e) => setCourtName(e.target.value)}
          placeholder="Court name"
          className="w-full h-12 rounded-xl border border-[#2a323a] bg-[#13202A] px-4 text-lg"
        />
        <div className="grid grid-cols-2 gap-4 my-4">
          <button
            onClick={saveName}
            className="h-12 rounded-xl bg-gradient-to-b from-[#0D6078] to-[#0C4F67] font-bold"
          >
            Save
          </button>
          <button
            onClick={resetName}
            className="h-12 rounded-xl bg-gradient-to-b from-[#274956] to-[#203946] font-bold"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <a
            href="/controller"
            className="h-12 flex items-center justify-center rounded-xl bg-[#2A5B6C] font-bold"
          >
            Controller
          </a>
          <a
            href="/live"
            className="h-12 flex items-center justify-center rounded-xl bg-[#6C8086] text-black font-bold"
          >
            Live
          </a>
        </div>
        <div className="opacity-60 text-xs mt-4">
          RTDB path: <code>/{path}</code>
        </div>
      </section>
    </main>
  );
}

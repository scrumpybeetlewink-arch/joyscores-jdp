
"use client";

import { useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, set } from "firebase/database";

const DEFAULT = (name: string) => ({
  meta: { name, bestOf: 3, golden: false },
  players: {
    "1a": { name: "Player 1", cc: "🇲🇾" },
    "1b": { name: "Player 2", cc: "🇲🇾" },
    "2a": { name: "Player 3", cc: "🇲🇾" },
    "2b": { name: "Player 4", cc: "🇲🇾" }
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  tiebreak: false,
  tb: { p1: 0, p2: 0 },
  server: "p1",
  ts: Date.now()
});

export default function SeedPage() {
  const [status, setStatus] = useState<string>("");

  async function seed() {
    try {
      await ensureAnonLogin();
      const ids = ["court1","court2","court3","court4","court5"];
      await Promise.all(ids.map((cid, i) => set(ref(db, `courts/${cid}`), DEFAULT(`Court ${i+1}`))));
      setStatus("Seeded 5 courts successfully.");
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message || "Seed failed");
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Seed 5 Courts</h1>
      <p>This writes default data to <code>courts/court1..court5</code> in RTDB.</p>
      <button onClick={seed}>Seed Now</button>
      <p>{status}</p>
    </main>
  );
}

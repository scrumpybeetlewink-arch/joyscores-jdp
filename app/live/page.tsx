"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";

type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: 3 | 5 };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  server: Side;
};

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: {
    "1a": { name: "", cc: "🏳️" },
    "1b": { name: "", cc: "🏳️" },
    "2a": { name: "", cc: "🏳️" },
    "2b": { name: "", cc: "🏳️" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  server: "p1",
};

export default function LivePage() {
  const searchParams = useSearchParams();
  const court = searchParams.get("court") ?? "court1";
  const path = `/courts/${court}`;
  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        await ensureAnonLogin();
      } catch {}
      unsub = onValue(ref(db, path), (snap) =>
        setS(snap.val() ?? defaultState)
      );
    })();
    return () => unsub();
  }, [path]);

  return (
    <main style={{ minHeight: "100vh", background: "#0B1B2B", color: "#fff", padding: 20 }}>
      <h1 style={{ fontSize: "1.5em", marginBottom: 20 }}>
        Live – {court}
      </h1>
      <pre>{JSON.stringify(s, null, 2)}</pre>
    </main>
  );
}

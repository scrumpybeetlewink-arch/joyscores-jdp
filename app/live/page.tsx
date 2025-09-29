"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

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
  tiebreak: boolean;
  tb: Record<Side, number>;
  server: Side | null;
  ts?: number;
};

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: {
    "1a": { name: "", cc: "🇲🇾" },
    "1b": { name: "", cc: "🇲🇾" },
    "2a": { name: "", cc: "🇲🇾" },
    "2b": { name: "", cc: "🇲🇾" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  tiebreak: false,
  tb: { p1: 0, p2: 0 },
  server: "p1",
  ts: undefined,
};

export default function LivePage() {
  const params = useSearchParams();
  const court = params.get("court") || "court1";
  const COURT_PATH = `/courts/${court}`;

  const [s, setS] = useState<ScoreState>(defaultState);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        await ensureAnonLogin();
      } catch {}
      unsub = onValue(ref(db, COURT_PATH), (snap) => {
        setS(snap.val() || defaultState);
      });
    })();
    return () => unsub();
  }, [court]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#212A31",
        color: "#fff",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ background: "#0B1B2B", padding: 24, borderRadius: 12 }}>
        <h2 style={{ textAlign: "center", marginBottom: 12 }}>
          {court.toUpperCase()}
        </h2>
        <pre>{JSON.stringify(s, null, 2)}</pre>
      </div>
    </main>
  );
}

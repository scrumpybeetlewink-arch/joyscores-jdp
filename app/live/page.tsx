"use client";

import { useState, useEffect } from "react";
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
  server: Side;
  golden: boolean;
};

function resolveCourtFromLocation(defaultCourt: string = "court1") {
  if (typeof window === "undefined") return defaultCourt;
  try {
    const q = new URLSearchParams(window.location.search).get("court");
    if (q && /^court[1-5]$/i.test(q)) return q.toLowerCase();
  } catch {}
  return defaultCourt;
}

export default function LivePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  ensureAnonLogin();

  const [court, setCourt] = useState<string>(() => resolveCourtFromLocation());
  useEffect(() => {
    setCourt(resolveCourtFromLocation());
  }, []);

  const [state, setState] = useState<ScoreState | null>(null);

  useEffect(() => {
    const r = ref(db, `courts/${court}/score`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      if (v) setState(v);
    });
    return () => unsub();
  }, [court]);

  if (!state) return <div style={{ padding: 16, color: "#9aa7b0" }}>Loading…</div>;

  const { players, points, games, sets, meta, server, golden } = state;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #0f2430)", color: "#fff" }}>
      <div style={{ width: "100%", maxWidth: 820, padding: 24 }}>
        <h1 style={{ margin: 0, marginBottom: 12, textAlign: "center", fontWeight: 800 }}>
          {meta?.name || "Court"}
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {players["1a"]?.name} &amp; {players["1b"]?.name}
            </div>
            <div style={{ opacity: 0.8, fontSize: 13, marginTop: 6 }}>
              Sets: {sets.p1.join(" ")} &nbsp;|&nbsp; Games: {games.p1} &nbsp;|&nbsp; Points: {points.p1}
            </div>
            {server === "p1" && <div style={{ color: "#ffd166", fontSize: 12, marginTop: 2 }}>● Serving</div>}
          </div>

          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {players["2a"]?.name} &amp; {players["2b"]?.name}
            </div>
            <div style={{ opacity: 0.8, fontSize: 13, marginTop: 6 }}>
              Sets: {sets.p2.join(" ")} &nbsp;|&nbsp; Games: {games.p2} &nbsp;|&nbsp; Points: {points.p2}
            </div>
            {server === "p2" && <div style={{ color: "#ffd166", fontSize: 12, marginTop: 2 }}>● Serving</div>}
          </div>
        </div>

        {golden && (
          <div style={{ marginTop: 16, textAlign: "center", color: "#ff6b6b", fontWeight: 800 }}>
            GOLDEN POINT
          </div>
        )}
      </div>
    </div>
  );
}

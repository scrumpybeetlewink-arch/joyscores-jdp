"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set, update } from "firebase/database";

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

export default function ControllerPage() {
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
      else {
        const init: ScoreState = {
          meta: { name: court, bestOf: 3 },
          players: { "1a": { name: "P1A", cc: "" }, "1b": { name: "P1B", cc: "" }, "2a": { name: "P2A", cc: "" }, "2b": { name: "P2B", cc: "" } },
          points: { p1: 0, p2: 0 },
          games: { p1: 0, p2: 0 },
          sets: { p1: [], p2: [] },
          server: "p1",
          golden: false,
        };
        set(ref(db, `courts/${court}/score`), init);
        setState(init);
      }
    });
    return () => unsub();
  }, [court]);

  if (!state) return <div style={{ padding: 16, color: "#9aa7b0" }}>Loading…</div>;

  const bumpPoint = (who: Side) => {
    const order: Point[] = [0, 15, 30, 40, "Ad"];
    const cur = state.points[who];
    const idx = order.indexOf(cur);
    const next = order[Math.min(idx + 1, order.length - 1)];
    update(ref(db, `courts/${court}/score/points`), { [who]: next as any });
  };

  const toggleGolden = () => {
    update(ref(db, `courts/${court}/score`), { golden: !state.golden });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #0f2430)", color: "#fff" }}>
      <div style={{ width: "100%", maxWidth: 920, padding: 24 }}>
        <h1 style={{ margin: 0, marginBottom: 12, textAlign: "center", fontWeight: 800 }}>
          {state.meta?.name || court}
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <button onClick={() => bumpPoint("p1")} style={{ padding: 14, borderRadius: 12, border: "none", background: "#0e6b86", color: "#fff", fontWeight: 800 }}>
            + Point P1
          </button>
          <button onClick={() => bumpPoint("p2")} style={{ padding: 14, borderRadius: 12, border: "none", background: "#0e6b86", color: "#fff", fontWeight: 800 }}>
            + Point P2
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>P1</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Points: {String(state.points.p1)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>P2</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Points: {String(state.points.p2)}</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={toggleGolden} style={{ padding: 12, borderRadius: 10, border: "none", background: state.golden ? "#ff6b6b" : "#5b6d76", color: "#fff", fontWeight: 800 }}>
            {state.golden ? "Golden ON" : "Golden OFF"}
          </button>
          <a href={`/live/?court=${court}`} style={{ padding: 12, borderRadius: 10, border: "none", background: "#1d4f61", color: "#fff", fontWeight: 800, textDecoration: "none" }}>
            Open Live
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf; goldenPoint: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  server: Side;
  last?: { t: string; [k: string]: any } | undefined;
};

const courtId = "court5";

function useScore(courtId: string) {
  const [state, setState] = useState<ScoreState>({
    meta: { name: "Court", bestOf: 3, goldenPoint: true },
    players: {
      "1a": { name: "P1A", cc: "ESP" },
      "1b": { name: "P1B", cc: "ESP" },
      "2a": { name: "P2A", cc: "FRA" },
      "2b": { name: "P2B", cc: "FRA" },
    },
    points: { p1: 0, p2: 0 },
    games: { p1: 0, p2: 0 },
    sets: { p1: [], p2: [] },
    server: "p1",
  });

  useEffect(() => {
    ensureAnonLogin?.();
    const r = ref(db, `courts/${courtId}/score`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      if (v) setState(v as ScoreState);
      else set(r, { ...state, meta: { ...state.meta, name: courtId } });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId]);

  return { state };
}

export default function Page() {
  const { state } = useScore(courtId);

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 16 }}>
      <header style={{ padding: 12, background: "var(--panel)", borderRadius: 16 }}>
        <h1 style={{ margin: 0 }}>Live • {state.meta.name} ({courtId})</h1>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <section style={{ background: "var(--panel)", borderRadius: 16, padding: 16 }}>
          <div style={{ opacity: 0.7, marginBottom: 8 }}>Team P1</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 12 }}>
            <div>
              <div>{state.players["1a"].name} ({state.players["1a"].cc})</div>
              <div>{state.players["1b"].name} ({state.players["1b"].cc})</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: 14 }}>Points</div>
              <div style={{ fontSize: 64, color: "var(--accent)" }}>{String(state.points.p1)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: 14 }}>Games</div>
              <div style={{ fontSize: 40 }}>{state.games.p1}</div>
            </div>
          </div>
        </section>

        <section style={{ background: "var(--panel)", borderRadius: 16, padding: 16 }}>
          <div style={{ opacity: 0.7, marginBottom: 8 }}>Team P2</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 12 }}>
            <div>
              <div>{state.players["2a"].name} ({state.players["2a"].cc})</div>
              <div>{state.players["2b"].name} ({state.players["2b"].cc})</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: 14 }}>Points</div>
              <div style={{ fontSize: 64, color: "var(--accent)" }}>{String(state.points.p2)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: 14 }}>Games</div>
              <div style={{ fontSize: 40 }}>{state.games.p2}</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";
import React from "react";
import { useScoreSync } from "./useScoreSync";

export default function LiveClient({ courtId }: { courtId: string }) {
  const { state } = useScoreSync(courtId);

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

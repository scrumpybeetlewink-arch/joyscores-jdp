"use client";
import React from "react";
import { useScoreSync } from "./useScoreSync";

export default function ControllerClient({ courtId }: { courtId: string }) {
  const { state, actions } = useScoreSync(courtId);
  const { incrementPoint, undo, swapSides, resetGames, resetMatch, toggleGoldenPoint } = actions;

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "var(--panel)", borderRadius: 16 }}>
        <h1 style={{ margin: 0 }}>Controller • {state.meta.name} ({courtId})</h1>
        <button onClick={toggleGoldenPoint} style={{ padding: "8px 12px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--text)" }}>
          Golden Point: {state.meta.goldenPoint ? "ON" : "OFF"}
        </button>
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
          <div style={{ marginTop: 12 }}>
            <button onClick={() => incrementPoint("p1")} style={{ padding: "10px 16px", background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 10 }}>+ P1 Point</button>
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
          <div style={{ marginTop: 12 }}>
            <button onClick={() => incrementPoint("p2")} style={{ padding: "10px 16px", background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 10 }}>+ P2 Point</button>
          </div>
        </section>
      </main>

      <section style={{ background: "var(--panel)", borderRadius: 16, padding: 16, marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={undo} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10 }}>Undo</button>
        <button onClick={swapSides} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10 }}>Swap Sides</button>
        <button onClick={resetGames} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10 }}>Reset Games</button>
        <button onClick={resetMatch} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10 }}>Reset Match</button>
      </section>
    </div>
  );
}

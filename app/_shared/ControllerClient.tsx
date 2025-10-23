"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, off, update } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf; golden?: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  tiebreak: boolean;
  tb: Record<Side, number>;
  server: Side;
  ts: number;
};

export default function ControllerClient({
  courtId,
}: {
  courtId: "court1" | "court2" | "court3" | "court4" | "court5";
}) {
  const [state, setState] = useState<ScoreState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { ensureAnonLogin(); }, []);

  useEffect(() => {
    const base = ref(db, `courts/${courtId}`);
    const unsub = onValue(
      base,
      (snap) => {
        setError(null);
        const val = snap.val();
        if (val) {
          (val as any).sets ||= { p1: [], p2: [] };
          (val as any).tb ||= { p1: 0, p2: 0 };
        }
        setState(val as ScoreState);
      },
      (err) => {
        setError(err?.message || "Permission denied or network error");
        setState(null);
      }
    );
    return () => off(base);
  }, [courtId]);

  function write(partial: Partial<ScoreState>) {
    return update(ref(db, `courts/${courtId}`), { ...partial, ts: Date.now() });
  }

  function toggleGolden() {
    if (!state) return;
    write({ meta: { ...state.meta, golden: !state.meta?.golden } as ScoreState["meta"] });
  }
  function setServer(side: Side) {
    write({ server: side } as Partial<ScoreState>);
  }
  function point(side: Side, delta: 1 | -1) {
    if (!state) return;
    const order: Point[] = [0, 15, 30, 40, "Ad"];
    const idx = order.indexOf(state.points[side]);
    const nextIdx = delta === 1 ? Math.min(idx + 1, order.length - 1) : Math.max(idx - 1, 0);
    write({ points: { ...state.points, [side]: order[nextIdx] } as ScoreState["points"] });
  }

  if (error) return <div style={{ padding: 16, color: "#f88" }}>Error: {error}</div>;
  if (!state) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <main style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto", color: "var(--text, #e9edf3)" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 56px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Controller — {state.meta?.name} ({courtId})
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button onClick={toggleGolden} style={btnSecondary}>
            Golden: {String(state.meta?.golden ?? false)}
          </button>
          <button onClick={() => setServer("p1")} style={btnSecondary}>Server → p1</button>
          <button onClick={() => setServer("p2")} style={btnSecondary}>Server → p2</button>
        </div>
      </header>

      <section style={{ display: "grid", gap: 14 }}>
        <TeamLine state={state} side="p1" top />
        <TeamLine state={state} side="p2" />
      </section>

      <section style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => point("p1", +1)} style={btnPrimary}>+ Point p1</button>
        <button onClick={() => point("p1", -1)} style={btnGhost}>- Point p1</button>
        <button onClick={() => point("p2", +1)} style={btnPrimary}>+ Point p2</button>
        <button onClick={() => point("p2", -1)} style={btnGhost}>- Point p2</button>
      </section>
    </main>
  );
}

/* ---------- Presentational row ---------- */
function TeamLine({
  state,
  side,
  top,
}: {
  state: ScoreState;
  side: Side;
  top?: boolean;
}) {
  const a = top ? state.players["1a"] : state.players["2a"];
  const b = top ? state.players["1b"] : state.players["2b"];
  const sets = top ? state.sets.p1 : state.sets.p2;
  const games = top ? state.games.p1 : state.games.p2;
  const points = String(top ? state.points.p1 : state.points.p2);
  const tb = top ? state.tb.p1 : state.tb.p2;
  const isServer = state.server === side;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 16,
        padding: "14px 16px",
        background: "var(--panel, #14161b)",
        borderRadius: 14,
      }}
    >
      {/* Left: flags + names + sets */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center" }}>
        <div style={{ fontSize: 22, lineHeight: "1.2" }}>
          <span style={{ marginRight: 6 }}>{a?.cc || "🏳️"}</span>
          <span>&amp;</span>
          <br />
          <span style={{ marginRight: 6 }}>{b?.cc || "🏳️"}</span>
          <span>&amp;</span>
        </div>
        <div>
          <div style={{ fontSize: "clamp(18px, 2.4vw, 28px)", fontWeight: 700, letterSpacing: "-0.01em" }}>
            {a?.name || "Player A"} &nbsp;&amp;&nbsp; {b?.name || "Player B"}
            {isServer ? <span style={{ marginLeft: 8, opacity: 0.7 }}>• serve</span> : null}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            {sets?.map((v, i) => (
              <span
                key={i}
                style={{
                  minWidth: 28,
                  textAlign: "center",
                  padding: "4px 6px",
                  background: "var(--panel-2, #1a1d23)",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                {v}
              </span>
            ))}
            <span
              style={{
                minWidth: 28,
                textAlign: "center",
                padding: "4px 6px",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 8,
                opacity: 0.8,
              }}
              title="current games"
            >
              {games}
            </span>
            <span
              style={{
                minWidth: 34,
                textAlign: "center",
                padding: "4px 6px",
                background: "var(--accent, #6AB2FF)",
                color: "#0b111a",
                borderRadius: 8,
                fontWeight: 800,
              }}
              title={state.tiebreak ? "tiebreak points" : "current points"}
            >
              {state.tiebreak ? tb : points}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Games / Points mirror */}
      <div style={{ textAlign: "right", opacity: 0.9, minWidth: 180 }}>
        <div>
          <strong>Games:</strong> {games}
          <span style={{ display: "inline-block", width: 10 }} />
          <strong>Points:</strong> {state.tiebreak ? tb : points}
        </div>
      </div>
    </div>
  );
}

/* buttons that respect your dark theme tokens */
const btnBase: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.12)",
  cursor: "pointer",
  fontWeight: 600,
  background: "var(--panel, #14161b)",
  color: "var(--text, #e9edf3)",
};
const btnSecondary: React.CSSProperties = { ...btnBase };
const btnGhost: React.CSSProperties = { ...btnBase, opacity: 0.85 };
const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "var(--accent, #6AB2FF)",
  color: "#0b111a",
  border: "none",
};

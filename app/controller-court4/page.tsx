"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {{
  meta: {{ name: string; bestOf: BestOf; goldenPoint: boolean }};
  players: {{ "1a": Player; "1b": Player; "2a": Player; "2b": Player }};
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: {{ p1: number[]; p2: number[] }};
  server: Side;
  last?: {{ t: string; [k: string]: any }} | undefined;
}};

const COURT_ID = "court4";

function useScoreSync(courtId: string) {{
  const [state, setState] = useState<ScoreState>({
    meta: {{ name: "Court", bestOf: 3, goldenPoint: true }},
    players: {{ "1a": {{ name: "P1A", cc: "ESP" }}, "1b": {{ name: "P1B", cc: "ESP" }}, "2a": {{ name: "P2A", cc: "FRA" }}, "2b": {{ name: "P2B", cc: "FRA" }} }},
    points: {{ p1: 0, p2: 0 }},
    games: {{ p1: 0, p2: 0 }},
    sets: {{ p1: [], p2: [] }},
    server: "p1",
  });

  useEffect(() => {{
    ensureAnonLogin?.();
    const r = ref(db, `courts/${{courtId}}/score`);
    const unsub = onValue(r, (snap) => {{
      const v = snap.val();
      if (v) setState(v as ScoreState);
      else set(r, {{ ...state, meta: {{ ...state.meta, name: courtId }} }});
    }});
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }}, [courtId]);

  const write = (next: ScoreState) => {{ setState(next); return set(ref(db, `courts/${{courtId}}/score`), next); }};

  const incrementPoint = (side: Side) => {{
    const s: ScoreState = JSON.parse(JSON.stringify(state));
    const other: Side = side === "p1" ? "p2" : "p1";
    if (s.meta.goldenPoint && s.points.p1 === 40 && s.points.p2 === 40) {{ s.games[side] += 1; s.points = {{ p1: 0, p2: 0 }}; s.last = {{ t: "game", side }}; return write(s); }}
    if (!s.meta.goldenPoint && s.points[other] === "Ad") {{ s.points[other] = 40; s.last = {{ t: "advBack", other }}; return write(s); }}
    if (s.points[side] === "Ad") {{ s.games[side] += 1; s.points = {{ p1: 0, p2: 0 }}; s.last = {{ t: "game", side }}; return write(s); }}
    const step = (p: Point): Point | "WIN" => (p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : "WIN");
    const np = step(s.points[side]);
    if (np === "WIN") {{ s.games[side] += 1; s.points = {{ p1: 0, p2: 0 }}; s.last = {{ t: "game", side }}; return write(s); }}
    if (!s.meta.goldenPoint && np === 40 && s.points[other] === 40) {{ s.points[side] = "Ad"; s.last = {{ t: "adv", side }}; return write(s); }}
    s.points[side] = np as Point; s.last = {{ t: "pt", side }}; return write(s);
  }};

  const undo = () => {{
    const s: ScoreState = JSON.parse(JSON.stringify(state)); const last = s.last; if (!last) return;
    if (last.t === "pt") {{ const side = last.side as Side; const p = s.points[side];
      if (p === 15) s.points[side] = 0; else if (p === 30) s.points[side] = 15;
      else if (p === 40) s.points[side] = 30; else if (p === "Ad") s.points[side] = 40;
    }} else if (last.t === "advBack") {{ const other = last.other as Side; s.points[other] = "Ad";
    }} else if (last.t === "adv") {{ const side = last.side as Side; s.points[side] = 40;
    }} else if (last.t === "game") {{ const side = last.side as Side; s.games[side] = Math.max(0, s.games[side] - 1); s.points = {{ p1: 40, p2: 40 }}; }}
    s.last = undefined; return write(s);
  }};

  const swapSides = () => {{ const s: ScoreState = JSON.parse(JSON.stringify(state));
    [s.players["1a"], s.players["2a"]] = [s.players["2a"], s.players["1a"]];
    [s.players["1b"], s.players["2b"]] = [s.players["2b"], s.players["1b"]];
    [s.games.p1, s.games.p2] = [s.games.p2, s.games.p1];
    [s.points.p1, s.points.p2] = [s.points.p2, s.points.p1];
    [s.sets.p1, s.sets.p2] = [s.sets.p2, s.sets.p1];
    s.server = s.server === "p1" ? "p2" : "p1"; return write(s);
  }};

  const resetGames = () => {{ const s: ScoreState = JSON.parse(JSON.stringify(state)); s.games = {{ p1: 0, p2: 0 }}; s.points = {{ p1: 0, p2: 0 }}; s.last = undefined; return write(s); }};
  const resetMatch = () => {{ const s: ScoreState = JSON.parse(JSON.stringify(state)); s.points = {{ p1: 0, p2: 0 }}; s.games = {{ p1: 0, p2: 0 }}; s.sets = {{ p1: [], p2: [] }}; s.last = undefined; return write(s); }};
  const toggleGoldenPoint = () => {{ const s: ScoreState = JSON.parse(JSON.stringify(state)); s.meta.goldenPoint = !s.meta.goldenPoint; return write(s); }};

  return {{ state, actions: {{ incrementPoint, undo, swapSides, resetGames, resetMatch, toggleGoldenPoint }} }};
}}

export default function Page() {{
  const {{ state, actions }} = useScoreSync(COURT_ID);
  const {{ incrementPoint, undo, swapSides, resetGames, resetMatch, toggleGoldenPoint }} = actions;

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "var(--panel)", borderRadius: 16 }}>
        <h1 style={{ margin: 0 }}>Controller • {{state.meta.name}} ({court4})</h1>
        <button onClick={{toggleGoldenPoint}} style={{ padding: "8px 12px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--text)" }}>
          Golden Point: {{state.meta.goldenPoint ? "ON" : "OFF"}}
        </button>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <section style={{ background: "var(--panel)", borderRadius: 16, padding: 16 }}>
          <div style={{ opacity: 0.7, marginBottom: 8 }}>Team P1</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 12 }}>
            <div>
              <div>{{state.players["1a"].name}} ({{state.players["1a"].cc}})</div>
              <div>{{state.players["1b"].name}} ({{state.players["1b"].cc}})</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: 14 }}>Points</div>
              <div style={{ fontSize: 64, color: "var(--accent)" }}>{{String(state.points.p1)}}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: 14 }}>Games</div>
              <div style={{ fontSize: 40 }}>{{state.games.p1}}</div>
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
              <div>{{state.players["2a"].name}} ({{state.players["2a"].cc}})</div>
              <div>{{state.players["2b"].name}} ({{state.players["2b"].cc}})</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: 14 }}>Points</div>
              <div style={{ fontSize: 64, color: "var(--accent)" }}>{{String(state.points.p2)}}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: 14 }}>Games</div>
              <div style={{ fontSize: 40 }}>{{state.games.p2}}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => incrementPoint("p2")} style={{ padding: "10px 16px", background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 10 }}>+ P2 Point</button>
          </div>
        </section>
      </main>

      <section style={{ background: "var(--panel)", borderRadius: 16, padding: 16, marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={{undo}} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10 }}>Undo</button>
        <button onClick={{swapSides}} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10 }}>Swap Sides</button>
        <button onClick={{resetGames}} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10 }}>Reset Games</button>
        <button onClick={{resetMatch}} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10 }}>Reset Match</button>
      </section>
    </div>
  );
}}

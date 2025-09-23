// @ts-nocheck
// app/controller/page.tsx (Diagnostic)
"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, update, set, type DatabaseReference } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;
type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: Record<Side, number>;
};

const DEFAULT: ScoreState = {
  meta: { name: "Court 1", bestOf: 3 },
  players: {
    "1a": { name: "P1A", cc: "my" },
    "1b": { name: "P1B", cc: "my" },
    "2a": { name: "P2A", cc: "my" },
    "2b": { name: "P2B", cc: "my" }
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets:  { p1: 0, p2: 0 }
};

function mergeDefaults(v: any): ScoreState {
  const s = v ?? {};
  const players = s.players ?? {};
  return {
    meta: { name: s.meta?.name ?? DEFAULT.meta.name, bestOf: (s.meta?.bestOf as BestOf) ?? DEFAULT.meta.bestOf },
    players: {
      "1a": { name: players["1a"]?.name ?? "P1A", cc: players["1a"]?.cc ?? "my" },
      "1b": { name: players["1b"]?.name ?? "P1B", cc: players["1b"]?.cc ?? "my" },
      "2a": { name: players["2a"]?.name ?? "P2A", cc: players["2a"]?.cc ?? "my" },
      "2b": { name: players["2b"]?.name ?? "P2B", cc: players["2b"]?.cc ?? "my" },
    },
    points: { p1: (s.points?.p1 ?? 0) as Point, p2: (s.points?.p2 ?? 0) as Point },
    games:  { p1: s.games?.p1 ?? 0, p2: s.games?.p2 ?? 0 },
    sets:   { p1: s.sets?.p1 ?? 0, p2: s.sets?.p2 ?? 0 },
  };
}

const other: Record<Side, Side> = { p1: "p2", p2: "p1" };
const ladder: Point[] = [0, 15, 30, 40];
function nextPoint(cur: Point, opp: Point) {
  if (cur === "Ad") return { self: 0 as Point, opp: 0 as Point, gameWon: true };
  if (cur === 40 && opp === "Ad") return { self: 40 as Point, opp: 40 as Point, gameWon: false };
  if (cur === 40 && opp === 40) return { self: "Ad" as Point, opp: 40 as Point, gameWon: false };
  if (cur === 40) return { self: 0 as Point, opp: 0 as Point, gameWon: true };
  const i = ladder.indexOf(cur);
  return { self: ladder[Math.min(i + 1, 3)], opp, gameWon: false };
}

export default function ControllerPage() {
  // pick path from query (?path=courts/court1 or ?path=court1). default to multi-court.
  const [path, setPath] = useState<string>(() => {
    if (typeof window === "undefined") return "courts/court1";
    return new URLSearchParams(window.location.search).get("path") || "courts/court1";
  });

  const [raw, setRaw] = useState<any>(null);
  const [phase, setPhase] = useState<"idle"|"listening"|"ready"|"error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const courtRef: DatabaseReference | null = useMemo(
    () => (db ? ref(db, path) : null),
    [db, path]
  );

  useEffect(() => {
    setErr(null);
    setRaw(null);
    setPhase("idle");

    if (!db || !courtRef) {
      setErr("Firebase not initialized (check NEXT_PUBLIC_* repo variables).");
      setPhase("error");
      return;
    }

    ensureAnonLogin().catch(() => {});
    setPhase("listening");

    const unsub = onValue(
      courtRef,
      (snap) => {
        setRaw(snap.exists() ? snap.val() : null);
        setPhase("ready");
      },
      (e) => {
        setErr(`Database error at "${path}": ${String(e)}`);
        setPhase("error");
      }
    );

    return () => unsub();
  }, [courtRef, path]);

  const state: ScoreState | null = raw ? mergeDefaults(raw) : null;

  async function repair() {
    if (!courtRef) return;
    const current = raw ?? {};
    const patch: any = {};
    if (!current.points) patch.points = DEFAULT.points;
    if (!current.games)  patch.games  = DEFAULT.games;
    if (!current.sets)   patch.sets   = DEFAULT.sets;
    if (!current.players || !current.players["1a"] || !current.players["1b"] || !current.players["2a"] || !current.players["2b"]) {
      patch.players = DEFAULT.players;
    }
    if (!current.meta || typeof current.meta.bestOf === "undefined" || typeof current.meta.name !== "string") {
      patch.meta = DEFAULT.meta;
    }
    if (Object.keys(patch).length) await update(courtRef, patch);
  }

  async function resetCourt() { if (courtRef) await set(courtRef, DEFAULT); }
  async function inc(side: Side) {
    if (!courtRef || !state) return;
    const cur = state.points[side], opp = state.points[other[side]];
    const n = nextPoint(cur, opp);
    if (n.gameWon) {
      await update(courtRef, { points: { p1: 0, p2: 0 }, games: { ...state.games, [side]: state.games[side] + 1 } });
    } else {
      await update(courtRef, { points: { ...state.points, [side]: n.self, [other[side]]: n.opp } });
    }
  }

  // ---- UI (always renders) ----
  return (
    <main style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: 12,
        background: "rgba(147,197,253,.08)", border: "1px solid rgba(147,197,253,.3)", borderRadius: 10, marginBottom: 12
      }}>
        <strong>Controller (diagnostic)</strong>
        <span style={{ opacity: .8 }}>• DB path:&nbsp;
          <code style={{ background: "rgba(0,0,0,.25)", padding: "2px 6px", borderRadius: 6 }}>{path}</code>
        </span>
        <span style={{ marginLeft: "auto", opacity: .8 }}>phase: {phase}</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <a href="/controller?path=courts/court1" style={linkStyle}>Use path=courts/court1</a>
        <a href="/controller?path=court1" style={linkStyle}>Use path=court1</a>
        <button onClick={repair} style={btnStyle}>Repair missing keys</button>
        <button onClick={resetCourt} style={btnStyle}>Reset court to defaults</button>
      </div>

      {err && (
        <div style={{ color: "#fecaca", marginBottom: 12 }}>
          <strong>Error:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{err}</span>
        </div>
      )}

      {/* Render a small scoreboard ONLY if state is known, else show instructions + raw json */}
      {state ? (
        <>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>{state.meta?.name ?? "Court"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Team title="Team 1" a={state.players?.["1a"]} b={state.players?.["1b"]}
                  games={state.games?.p1 ?? 0} sets={state.sets?.p1 ?? 0} points={(state.points?.p1 ?? 0) as Point} />
            <Team title="Team 2" a={state.players?.["2a"]} b={state.players?.["2b"]}
                  games={state.games?.p2 ?? 0} sets={state.sets?.p2 ?? 0} points={(state.points?.p2 ?? 0) as Point} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => inc("p1")} style={btnStyle}>+ Point P1</button>
            <button onClick={() => inc("p2")} style={btnStyle}>+ Point P2</button>
          </div>
        </>
      ) : (
        <div style={{ marginBottom: 12, opacity: .85 }}>
          No state yet. If the path is empty, click <em>Reset court to defaults</em> to seed it.
        </div>
      )}

      <details>
        <summary style={{ cursor: "pointer" }}>Raw snapshot (debug)</summary>
        <pre style={{ whiteSpace: "pre-wrap", background: "rgba(255,255,255,.06)", padding: 12, borderRadius: 8, marginTop: 8 }}>
{JSON.stringify(raw, null, 2)}
        </pre>
      </details>
    </main>
  );
}

const linkStyle: React.CSSProperties = {
  textDecoration: "underline",
  color: "#93c5fd",
  padding: "6px 8px",
  borderRadius: 8,
  background: "rgba(147,197,253,.08)",
  border: "1px solid rgba(147,197,253,.3)"
};

const btnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.06)",
  color: "inherit",
  cursor: "pointer"
};

function Team(props: { title: string; a?: Player; b?: Player; games: number; sets: number; points: Point }) {
  const { title, a, b, games, sets, points } = props;
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{title}</strong>
        <span style={{ opacity: .8 }}>Sets {sets} • Games {games} • Points {String(points)}</span>
      </div>
      <div style={{ opacity: .9 }}>{a?.name ?? "—"} / {b?.name ?? "—"}</div>
    </div>
  );
}

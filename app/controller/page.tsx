// @ts-nocheck
"use client";

// Keep routes exportable
export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, update, set, type DatabaseReference } from "firebase/database";

/** ---------- Domain types (non-opinionated) ---------- */
type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;

type ScoreState = {
  meta?: { name?: string; bestOf?: BestOf };
  players?: {
    "1a"?: { name?: string; cc?: string };
    "1b"?: { name?: string; cc?: string };
    "2a"?: { name?: string; cc?: string };
    "2b"?: { name?: string; cc?: string };
  };
  points?: { p1?: Point; p2?: Point };
  games?: { p1?: number; p2?: number };
  sets?:  { p1?: number; p2?: number };
};

/** ---------- Safe defaults ---------- */
const DEFAULT: Required<ScoreState> = {
  meta: { name: "Court 1", bestOf: 3 },
  players: {
    "1a": { name: "", cc: "MY" },
    "1b": { name: "", cc: "MY" },
    "2a": { name: "", cc: "MY" },
    "2b": { name: "", cc: "MY" }
  },
  points: { p1: 0, p2: 0 },
  games:  { p1: 0, p2: 0 },
  sets:   { p1: 0, p2: 0 }
};

const ladder: Point[] = [0, 15, 30, 40];
const other: Record<Side, Side> = { p1: "p2", p2: "p1" };

/** ---------- Merge helper: preserves keys & fills missing ---------- */
function mergeDefaults(v: any): Required<ScoreState> {
  const s = v ?? {};
  const p = s.players ?? {};
  return {
    meta:   { name: s.meta?.name ?? DEFAULT.meta.name, bestOf: (s.meta?.bestOf as BestOf) ?? DEFAULT.meta.bestOf },
    players:{
      "1a": { name: p["1a"]?.name ?? DEFAULT.players["1a"].name, cc: p["1a"]?.cc ?? DEFAULT.players["1a"].cc },
      "1b": { name: p["1b"]?.name ?? DEFAULT.players["1b"].name, cc: p["1b"]?.cc ?? DEFAULT.players["1b"].cc },
      "2a": { name: p["2a"]?.name ?? DEFAULT.players["2a"].name, cc: p["2a"]?.cc ?? DEFAULT.players["2a"].cc },
      "2b": { name: p["2b"]?.name ?? DEFAULT.players["2b"].name, cc: p["2b"]?.cc ?? DEFAULT.players["2b"].cc },
    },
    points: { p1: (s.points?.p1 ?? 0) as Point, p2: (s.points?.p2 ?? 0) as Point },
    games:  { p1: s.games?.p1 ?? 0, p2: s.games?.p2 ?? 0 },
    sets:   { p1: s.sets?.p1 ?? 0, p2: s.sets?.p2 ?? 0 },
  };
}

function nextPoint(cur: Point, opp: Point) {
  if (cur === "Ad") return { self: 0 as Point, opp: 0 as Point, gameWon: true };
  if (cur === 40 && opp === "Ad") return { self: 40 as Point, opp: 40 as Point, gameWon: false };
  if (cur === 40 && opp === 40) return { self: "Ad" as Point, opp: 40 as Point, gameWon: false };
  if (cur === 40)             return { self: 0 as Point,  opp: 0 as Point,  gameWon: true  };
  const i = ladder.indexOf(cur);
  return { self: ladder[Math.min(i + 1, 3)], opp, gameWon: false };
}
function prevPoint(p: Point): Point {
  if (p === "Ad") return 40;
  if (p === 40) return 30;
  if (p === 30) return 15;
  if (p === 15) return 0;
  return 0;
}

/** ---------- Page (wraps your original UI) ---------- */
export default function ControllerPage() {
  const DEFAULT_PATH = "courts/court1";
  const [path] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_PATH;
    return new URLSearchParams(window.location.search).get("path") || DEFAULT_PATH;
  });

  const courtRef: DatabaseReference | null = useMemo(() => (db ? ref(db, path) : null), [db, path]);

  const [raw, setRaw] = useState<any>(null);
  const [state, setState] = useState<Required<ScoreState> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    setRaw(null);
    setState(null);

    if (!db || !courtRef) {
      setErr("Firebase not initialized – check NEXT_PUBLIC_* repo variables.");
      return;
    }

    ensureAnonLogin().catch(() => {});
    const unsub = onValue(
      courtRef,
      (snap) => {
        const val = snap.exists() ? snap.val() : null;

        // Self-repair DB shape
        if (val) {
          const patch: any = {};
          if (!val.points) patch.points = DEFAULT.points;
          if (!val.games)  patch.games  = DEFAULT.games;
          if (!val.sets)   patch.sets   = DEFAULT.sets;
          const pl = val.players ?? {};
          if (!pl["1a"] || !pl["1b"] || !pl["2a"] || !pl["2b"]) patch.players = DEFAULT.players;
          if (!val.meta || typeof val.meta.name !== "string" || typeof val.meta.bestOf === "undefined") {
            patch.meta = DEFAULT.meta;
          }
          if (Object.keys(patch).length) update(courtRef, patch).catch(() => {});
        }

        setRaw(val);
        setState(val ? mergeDefaults(val) : null);
      },
      (e) => setErr(String(e))
    );
    return () => unsub();
  }, [courtRef]);

  // Mutations exposed to your UI
  const actions = {
    setField: async (key: string, value: any) => { if (courtRef) await update(courtRef, { [key]: value }); },
    resetCourt: async () => { if (courtRef) await set(courtRef, DEFAULT); },
    repairCourt: async () => {
      if (!courtRef) return;
      const current = raw ?? {};
      const patch: any = {};
      if (!current.points) patch.points = DEFAULT.points;
      if (!current.games)  patch.games  = DEFAULT.games;
      if (!current.sets)   patch.sets   = DEFAULT.sets;
      const p = current.players ?? {};
      if (!p["1a"] || !p["1b"] || !p["2a"] || !p["2b"]) patch.players = DEFAULT.players;
      if (!current.meta || typeof current.meta.name !== "string" || typeof current.meta.bestOf === "undefined") {
        patch.meta = DEFAULT.meta;
      }
      if (Object.keys(patch).length) await update(courtRef, patch);
    },
    inc: async (side: Side) => {
      if (!courtRef || !state) return;
      const cur = state.points[side], opp = state.points[other[side]];
      const n = nextPoint(cur, opp);
      if (n.gameWon) {
        await update(courtRef, { points: { p1: 0, p2: 0 }, games: { ...state.games, [side]: state.games[side] + 1 } });
      } else {
        await update(courtRef, { points: { ...state.points, [side]: n.self, [other[side]]: n.opp } });
      }
    },
    dec: async (side: Side) => {
      if (!courtRef || !state) return;
      const cur = state.points[side];
      await update(courtRef, { points: { ...state.points, [side]: prevPoint(cur) } });
    },
    resetPoints: async () => { if (courtRef) await update(courtRef, { points: { p1: 0, p2: 0 } }); }
  };

  /** 
   * ⬇︎ PASTE YOUR ORIGINAL UI HERE ⬇︎
   * Replace everything inside the <OriginalUI … /> component with your old JSX/CSS.
   * You can use: state (merged defaults), actions, path, err for rendering & buttons.
   */
  return <OriginalUI state={state} actions={actions} path={path} err={err} />;
}

/** Keep this component as a shell for your original markup */
function OriginalUI({
  state, actions, path, err
}: {
  state: Required<ScoreState> | null;
  actions: {
    setField: (k: string, v: any) => Promise<void>;
    resetCourt: () => Promise<void>;
    repairCourt: () => Promise<void>;
    inc: (s: Side) => Promise<void>;
    dec: (s: Side) => Promise<void>;
    resetPoints: () => Promise<void>;
  };
  path: string;
  err: string | null;
}) {
  /* ⬇︎ PASTE YOUR ORIGINAL UI HERE ⬇︎
     Use `state` for all values, `actions` for buttons, show `err` if present, and `path` if you display it.
     Do not change the wrappers/imports above — just replace the return below with your exact UI. */

  // TEMP minimal shell so the page renders before you paste:
  return (
    <main style={{ padding: 16 }}>
      <h2>Paste your original Controller UI here</h2>
      <p style={{ opacity: .8 }}>path: <code>{path}</code></p>
      {err && <p style={{ color: "#f88" }}>Error: {err}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => actions.inc("p1")}>+P1</button>
        <button onClick={() => actions.inc("p2")}>+P2</button>
        <button onClick={() => actions.dec("p1")}>−P1</button>
        <button onClick={() => actions.dec("p2")}>−P2</button>
        <button onClick={actions.resetPoints}>Reset points</button>
        <button onClick={actions.repairCourt}>Repair</button>
        <button onClick={actions.resetCourt}>Reset court</button>
      </div>
      <pre style={{ marginTop: 12, background: "rgba(255,255,255,.06)", padding: 12, borderRadius: 8 }}>
{JSON.stringify(state, null, 2)}
      </pre>
    </main>
  );
}

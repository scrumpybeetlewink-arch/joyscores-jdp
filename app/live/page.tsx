// @ts-nocheck
"use client";

// Keep route exportable
export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, type DatabaseReference } from "firebase/database";

/** ---------- Types & defaults ---------- */
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

/** ---------- Page ---------- */
export default function LivePage() {
  const DEFAULT_PATH = "courts/court1";
  const [path] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_PATH;
    return new URLSearchParams(window.location.search).get("path") || DEFAULT_PATH;
  });

  const courtRef: DatabaseReference | null = useMemo(() => (db ? ref(db, path) : null), [db, path]);
  const [raw, setRaw] = useState<any>(null);
  const [state, setState] = useState<Required<ScoreState>>(DEFAULT);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    setRaw(null);
    setState(DEFAULT);

    if (!db || !courtRef) {
      setErr("Firebase not initialized – check NEXT_PUBLIC_* repo variables.");
      return;
    }

    ensureAnonLogin().catch(() => {});
    const unsub = onValue(
      courtRef,
      (snap) => {
        const val = snap.exists() ? snap.val() : null;
        setRaw(val);
        setState(val ? mergeDefaults(val) : DEFAULT);
      },
      (e) => setErr(String(e))
    );
    return () => unsub();
  }, [courtRef]);

  /** 
   * ⬇︎ PASTE YOUR ORIGINAL UI HERE ⬇︎
   * Replace everything inside the <OriginalUI … /> component with your old JSX/CSS.
   * You can use: state (merged defaults), path, err for rendering.
   */
  return <OriginalUI state={state} path={path} err={err} />;
}

function OriginalUI({ state, path, err }: { state: Required<ScoreState>, path: string, err: string | null }) {
  /* ⬇︎ PASTE YOUR ORIGINAL UI HERE ⬇︎
     Use `state` (read-only), show `err` if present, and `path` if you display it.
     Do not change the wrappers/imports above — just replace the return below with your exact UI. */

  // TEMP minimal shell so the page renders before you paste:
  const P = state.points, G = state.games, S = state.sets;
  return (
    <main style={{ padding: 16 }}>
      <h2>Paste your original Live UI here</h2>
      <p style={{ opacity: .8 }}>path: <code>{path}</code></p>
      {err && <p style={{ color: "#f88" }}>Error: {err}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><strong>Team 1</strong> — Sets {S.p1} • Games {G.p1} • Points {String(P.p1)}</div>
        <div><strong>Team 2</strong> — Sets {S.p2} • Games {G.p2} • Points {String(P.p2)}</div>
      </div>
    </main>
  );
}

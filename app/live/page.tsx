// @ts-nocheck
"use client";

export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, type DatabaseReference } from "firebase/database";

type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;

const DEFAULT = {
  meta: { name: "Court 1", bestOf: 3 as BestOf },
  players: {
    "1a": { name: "", cc: "MY" },
    "1b": { name: "", cc: "MY" },
    "2a": { name: "", cc: "MY" },
    "2b": { name: "", cc: "MY" }
  },
  points: { p1: 0 as Point, p2: 0 as Point },
  games: { p1: 0, p2: 0 },
  sets:  { p1: 0, p2: 0 }
};

function mergeDefaults(v: any) {
  const s = v ?? {};
  const players = s.players ?? {};
  return {
    meta: { name: s.meta?.name ?? DEFAULT.meta.name, bestOf: (s.meta?.bestOf as BestOf) ?? DEFAULT.meta.bestOf },
    players: {
      "1a": { name: players["1a"]?.name ?? "", cc: players["1a"]?.cc ?? "MY" },
      "1b": { name: players["1b"]?.name ?? "", cc: players["1b"]?.cc ?? "MY" },
      "2a": { name: players["2a"]?.name ?? "", cc: players["2a"]?.cc ?? "MY" },
      "2b": { name: players["2b"]?.name ?? "", cc: players["2b"]?.cc ?? "MY" },
    },
    points: { p1: (s.points?.p1 ?? 0) as Point, p2: (s.points?.p2 ?? 0) as Point },
    games:  { p1: s.games?.p1 ?? 0, p2: s.games?.p2 ?? 0 },
    sets:   { p1: s.sets?.p1 ?? 0, p2: s.sets?.p2 ?? 0 },
  };
}

export default function LivePage() {
  const defaultPath = "courts/court1";
  const [path] = useState<string>(() => {
    if (typeof window === "undefined") return defaultPath;
    return new URLSearchParams(window.location.search).get("path") || defaultPath;
  });

  const courtRef: DatabaseReference | null = useMemo(() => (db ? ref(db, path) : null), [db, path]);

  const [raw, setRaw] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    setRaw(null);

    if (!db || !courtRef) {
      setErr("Firebase not initialized – check NEXT_PUBLIC_* repo variables.");
      return;
    }

    ensureAnonLogin().catch(() => {});
    const unsub = onValue(
      courtRef,
      (snap) => setRaw(snap.exists() ? snap.val() : null),
      (e) => setErr(String(e))
    );
    return () => unsub();
  }, [courtRef]);

  const state = raw ? mergeDefaults(raw) : DEFAULT;
  const P = state.points ?? { p1:0, p2:0 };
  const G = state.games  ?? { p1:0, p2:0 };
  const S = state.sets   ?? { p1:0, p2:0 };

  return (
    <main style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui", color:"#e9edf3" }}>
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
        <strong>Live</strong>
        <span style={{ opacity:.8 }}>path: <code style={{ background:"rgba(255,255,255,.08)", padding:"2px 6px", borderRadius:6 }}>{path}</code></span>
        {err && <span style={{ color:"#fecaca" }}>• {err}</span>}
      </div>

      <h1 style={{ fontSize:24, fontWeight:800, marginBottom:12 }}>{state.meta?.name || "Court 1"}</h1>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <Team title="Team 1" a={state.players?.["1a"]} b={state.players?.["1b"]} games={G.p1} sets={S.p1} points={P.p1} />
        <Team title="Team 2" a={state.players?.["2a"]} b={state.players?.["2b"]} games={G.p2} sets={S.p2} points={P.p2} />
      </div>
    </main>
  );
}

function Team({ title, a, b, games, sets, points }:{ title:string; a:any; b:any; games:number; sets:number; points:Point }) {
  return (
    <div style={{ background:"rgba(255,255,255,.06)", borderRadius:12, padding:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <strong>{title}</strong>
        <span style={{ opacity:.8 }}>Sets {sets} • Games {games} • Points {String(points)}</span>
      </div>
      <div style={{ opacity:.9 }}>{a?.name || "—"} / {b?.name || "—"}</div>
    </div>
  );
}

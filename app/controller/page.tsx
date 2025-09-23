// @ts-nocheck
// app/controller/page.tsx
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
    "1a": { name: "", cc: "MY" },
    "1b": { name: "", cc: "MY" },
    "2a": { name: "", cc: "MY" },
    "2b": { name: "", cc: "MY" }
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
function prevPoint(p: Point): Point {
  if (p === "Ad") return 40;
  if (p === 40) return 30;
  if (p === 30) return 15;
  if (p === 15) return 0;
  return 0;
}

export default function ControllerPage() {
  const [path] = useState<string>(() => {
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
        const val = snap.exists() ? snap.val() : null;
        // Self-repair missing branches
        if (val) {
          const patch: any = {};
          if (!val.points) patch.points = DEFAULT.points;
          if (!val.games)  patch.games  = DEFAULT.games;
          if (!val.sets)   patch.sets   = DEFAULT.sets;
          if (!val.players || !val.players["1a"] || !val.players["1b"] || !val.players["2a"] || !val.players["2b"]) {
            patch.players = DEFAULT.players;
          }
          if (!val.meta || typeof val.meta.bestOf === "undefined" || typeof val.meta.name !== "string") {
            patch.meta = DEFAULT.meta;
          }
          if (Object.keys(patch).length) { update(courtRef, patch).catch(() => {}); }
        }
        setRaw(val);
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

  async function setField(k: string, v: any) { if (courtRef) await update(courtRef, { [k]: v }); }
  async function updateMetaName(name: string) { await setField("meta/name", name); }
  async function updateBestOf(v: BestOf) { await setField("meta/bestOf", v); }
  async function updatePlayer(key: "1a"|"1b"|"2a"|"2b", field: "name"|"cc", value: string) {
    if (!state) return;
    await update(courtRef!, { [`players/${key}/${field}`]: value });
  }

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
  async function dec(side: Side) {
    if (!courtRef || !state) return;
    const cur = state.points[side];
    await update(courtRef, { points: { ...state.points, [side]: prevPoint(cur) } });
  }
  async function resetPoints() { if (courtRef) await update(courtRef, { points: { p1: 0, p2: 0 } }); }
  async function newMatch() { if (courtRef) await set(courtRef, DEFAULT); }

  return (
    <main style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui", color: "var(--text, #e9edf3)" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <strong>Controller</strong>
        <span style={{ opacity: .8 }}>path: <code style={{ background: "rgba(255,255,255,.08)", padding: "2px 6px", borderRadius: 6 }}>{path}</code></span>
        <span style={{ marginLeft: "auto", opacity: .8 }}>phase: {phase}</span>
      </header>

      {err && (
        <div style={{ color: "#fecaca", marginBottom: 12 }}>
          <strong>Error:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{err}</span>
        </div>
      )}

      <section style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Court name</label>
          <input
            value={state?.meta?.name ?? ""}
            onChange={(e) => updateMetaName(e.target.value)}
            placeholder="Court name"
            style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.2)", width: 320 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Best of</label>
          <select
            value={state?.meta?.bestOf ?? 3}
            onChange={(e) => updateBestOf(Number(e.target.value) as BestOf)}
            style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.2)" }}
          >
            <option value={3}>Best of 3</option>
            <option value={5}>Best of 5</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {(["1a","1b","2a","2b"] as const).map((key) => (
            <div key={key} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Player {key.toUpperCase()}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={state?.players?.[key]?.name ?? ""}
                  onChange={(e) => updatePlayer(key, "name", e.target.value)}
                  placeholder="Name"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.2)" }}
                />
                <input
                  value={state?.players?.[key]?.cc ?? ""}
                  onChange={(e) => updatePlayer(key, "cc", e.target.value)}
                  placeholder="CC"
                  style={{ width: 80, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.2)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <ScoreCard title="Team 1" points={state?.points?.p1 ?? 0} games={state?.games?.p1 ?? 0} sets={state?.sets?.p1 ?? 0} />
        <ScoreCard title="Team 2" points={state?.points?.p2 ?? 0} games={state?.games?.p2 ?? 0} sets={state?.sets?.p2 ?? 0} />
      </section>

      <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => inc("p1")} style={btn}>+ Point P1</button>
        <button onClick={() => inc("p2")} style={btn}>+ Point P2</button>
        <button onClick={() => dec("p1")} style={btn}>− Point P1</button>
        <button onClick={() => dec("p2")} style={btn}>− Point P2</button>
        <button onClick={resetPoints} style={{ ...btn, marginLeft: "auto" }}>Reset points</button>
        <button onClick={newMatch} style={btn}>New match</button>
      </section>

      <details style={{ marginTop: 14 }}>
        <summary>Raw snapshot (debug)</summary>
        <pre style={{ whiteSpace: "pre-wrap", background: "rgba(255,255,255,.06)", padding: 12, borderRadius: 8, marginTop: 8 }}>
{JSON.stringify(raw, null, 2)}
        </pre>
      </details>
    </main>
  );
}

function ScoreCard({ title, points, games, sets }: { title: string; points: Point; games: number; sets: number }) {
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <strong>{title}</strong>
        <span style={{ opacity: .85 }}>Sets {sets} • Games {games}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{String(points)}</div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.06)",
  color: "inherit",
  cursor: "pointer"
};

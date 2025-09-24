// @ts-nocheck
"use client";

export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

/** ---------- Types ---------- */
type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;

type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  tiebreak: boolean;
  tb: Record<Side, number>;
  server: Side | null;
  ts?: number;
};

/** ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: {
    "1a": { name: "", cc: "🇲🇾" },
    "1b": { name: "", cc: "🇲🇾" },
    "2a": { name: "", cc: "🇲🇾" },
    "2b": { name: "", cc: "🇲🇾" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  tiebreak: false,
  tb: { p1: 0, p2: 0 },
  server: "p1",
  ts: undefined,
};

function normalize(v: any): ScoreState {
  if (!v) return defaultState;
  return {
    ...defaultState,
    ...v,
    meta: {
      name: v?.meta?.name ?? "",
      bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
    },
  };
}

/** =========================================================
 *  Live Page (simplified, always shows readable scoreboard)
 *  =========================================================
 */
export default function LivePage() {
  // Allow override via ?path=... ; default to multi-court node
  const defaultPath = "courts/court1";
  const [path] = useState<string>(() => {
    if (typeof window === "undefined") return defaultPath;
    return new URLSearchParams(window.location.search).get("path") || defaultPath;
  });

  const [s, setS] = useState<ScoreState>(defaultState);
  const [courtName, setCourtName] = useState<string>("");

  // Subscribe to Firebase
  useEffect(() => {
    let unsubScore = () => {};
    let unsubName = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsubScore = onValue(ref(db, path), (snap) => setS(normalize(snap.val())));              // ✅ fixed path
      unsubName = onValue(ref(db, `${path}/meta/name`), (snap) => {                            // ✅ fixed path
        const v = snap.val();
        setCourtName(typeof v === "string" ? v : "");
      });
    })();
    return () => { unsubScore?.(); unsubName?.(); };
  }, [path]);

  const maxSets = useMemo(
    () => ((s?.meta?.bestOf ?? 3) === 5 ? 5 : 3),
    [s?.meta?.bestOf]
  );

  const Row = ({ side }: { side: Side }) => {
    const players = s.players;
    const sets = s.sets;
    const games = s.games;

    const p1a = nameOrLabel(players["1a"].name, "Player 1");
    const p1b = nameOrLabel(players["1b"].name, "Player 2");
    const p2a = nameOrLabel(players["2a"].name, "Player 3");
    const p2b = nameOrLabel(players["2b"].name, "Player 4");

    const line =
      side === "p1"
        ? `${flag(players["1a"].cc)} ${p1a} / ${flag(players["1b"].cc)} ${p1b}`
        : `${flag(players["2a"].cc)} ${p2a} / ${flag(players["2b"].cc)} ${p2b}`;

    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finished) return side === "p1" ? sets.p1[i] ?? "" : sets.p2[i] ?? "";
      if (i === finished) return side === "p1" ? games.p1 ?? "" : games.p2 ?? "";
      return "";
    });

    const points = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    return (
      <div className="row">
        <div className="teamline">{line}</div>
        <div className="serveCol">{s.server === side ? "🎾" : ""}</div>
        <div className="scoreGrid" style={{ gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => (
            <div key={i} className="scoreBox">{v}</div>
          ))}
          <div className="scoreBox">{String(points)}</div>
        </div>
      </div>
    );
  };

  return (
    <main className="wrap">
      <style>{`
        :root{
          --c-ink:#212A31;
          --c-ink-2:#0B1B2B;
          --c-muted:#748D92;
          --c-cloud:#D3D9D4;
        }
        .wrap{ min-height:100vh; background:var(--c-ink);
          display:flex; align-items:center; justify-content:center; padding:2vh 2vw;}
        .card{ width:min(1100px, 95vw); background:var(--c-ink-2); color:#fff;
          border-radius:16px; box-shadow:0 6px 20px rgba(0,0,0,.25); padding:1rem 1.2rem;}
        .header{ text-align:center; padding-bottom:.8rem;
          border-bottom:1px solid rgba(211,217,212,.16);}
        .courtName{ font-size:1.5em; font-weight:800; color:var(--c-cloud);}
        .rows{ display:grid; gap:.9rem; margin-top:.9rem;}
        .row{ display:grid; grid-template-columns: 1fr 2.8em minmax(0,1fr);
          gap:.7em; align-items:center; font-size:1.3em;}
        .teamline{ color:var(--c-cloud); overflow:hidden; white-space:nowrap; text-overflow:ellipsis;}
        .serveCol{ text-align:center;}
        .scoreGrid{ display:grid; gap:.35em;}
        .scoreBox{ background:var(--c-muted); color:#0b1419;
          border-radius:10px; min-height:2em; display:flex;
          align-items:center; justify-content:center; font-weight:800;}
      `}</style>

      <section className="card">
        <div className="header"><div className="courtName">{courtName || "Court"}</div></div>
        <div className="rows">
          <Row side="p1" />
          <Row side="p2" />
        </div>
      </section>
    </main>
  );
}

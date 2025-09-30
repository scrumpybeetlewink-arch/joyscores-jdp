"use client";

export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

/* ---------- Types ---------- */
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
  server: Side | null;
  ts?: number;
};

/* ---------- Fixed single-court paths ---------- */
const court = "court1";
const COURT_PATH = `/courts/${court}`;
const META_NAME_PATH = `/courts/${court}/meta/name`;

/* ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

/* ---------- Defaults ---------- */
const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3, golden: false },
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
  const s = v ?? {};
  return {
    ...defaultState,
    meta: {
      name: s?.meta?.name ?? "",
      bestOf: (s?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
      golden: !!s?.meta?.golden,
    },
    players: {
      "1a": { name: s?.players?.["1a"]?.name ?? "", cc: s?.players?.["1a"]?.cc ?? "🇲🇾" },
      "1b": { name: s?.players?.["1b"]?.name ?? "", cc: s?.players?.["1b"]?.cc ?? "🇲🇾" },
      "2a": { name: s?.players?.["2a"]?.name ?? "", cc: s?.players?.["2a"]?.cc ?? "🇲🇾" },
      "2b": { name: s?.players?.["2b"]?.name ?? "", cc: s?.players?.["2b"]?.cc ?? "🇲🇾" },
    },
    points: {
      p1: (s?.points?.p1 ?? 0) as Point,
      p2: (s?.points?.p2 ?? 0) as Point,
    },
    games: {
      p1: Number.isFinite(s?.games?.p1) ? s.games.p1 : 0,
      p2: Number.isFinite(s?.games?.p2) ? s.games.p2 : 0,
    },
    sets: {
      p1: Array.isArray(s?.sets?.p1) ? s.sets.p1 : [],
      p2: Array.isArray(s?.sets?.p2) ? s.sets.p2 : [],
    },
    tiebreak: !!s?.tiebreak,
    tb: {
      p1: Number.isFinite(s?.tb?.p1) ? s.tb.p1 : 0,
      p2: Number.isFinite(s?.tb?.p2) ? s.tb.p2 : 0,
    },
    server: s?.server === "p1" || s?.server === "p2" ? s.server : "p1",
    ts: typeof s?.ts === "number" ? s.ts : undefined,
  };
}

/* =========================================================
 * Live (read-only)
 * =======================================================*/
export default function LivePage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [courtName, setCourtName] = useState<string>("");

  useEffect(() => {
    let unsubScore = () => {};
    let unsubName = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsubScore = onValue(ref(db, COURT_PATH), (snap) => setS(normalize(snap.val())));
      unsubName = onValue(ref(db, META_NAME_PATH), (snap) => {
        const v = snap.val();
        setCourtName(typeof v === "string" ? v : "");
      });
    })();
    return () => { unsubScore?.(); unsubName?.(); };
  }, []);

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
      <div
        className="row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 3rem minmax(0,1fr)",
          gap: "1rem",
          alignItems: "center",
          fontSize: "1.28em",
        }}
      >
        <div className="teamline">{line}</div>
        <div className="serve">{s.server === side ? "🎾" : ""}</div>
        <div
          className="grid"
          style={{
            display: "grid",
            gap: ".6rem",
            gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)`,
          }}
        >
          {setCells.map((v, i) => (
            <div key={i} className="box">{v}</div>
          ))}
          <div className="box">{String(points)}</div>
        </div>
      </div>
    );
  };

  return (
    <main className="wrap" style={{ minHeight:"100vh", background:"var(--ink)", display:"flex", alignItems:"center", justifyContent:"center", padding:"2vh 2vw" }}>
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --muted:#748D92; --cloud:#D3D9D4; }
        .card{
          width:min(1100px,95vw);
          background:var(--ink2); color:#fff;
          border-radius:16px; box-shadow:0 6px 20px rgba(0,0,0,.25);
          padding:1rem 1.25rem;
        }
        .header{ text-align:center; padding-bottom:.8rem; border-bottom:1px solid rgba(211,217,212,.16); }
        .court{ font-size:1.5em; font-weight:800; color:var(--cloud); }

        .rows{ display:grid; gap:.9rem; margin-top:.9rem; }
        .teamline{ color:var(--cloud); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .box{
          background:var(--muted); color:#0b1419;
          border-radius:12px; min-height:2.4em;
          display:flex; align-items:center; justify-content:center; font-weight:800;
        }
      `}</style>

      <section className="card">
        <div className="header"><div className="court">{courtName || "Court"}</div></div>
        <div className="rows">
          <Row side="p1" />
          <Row side="p2" />
        </div>
      </section>
    </main>
  );
}

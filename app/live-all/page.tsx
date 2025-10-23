"use client";
export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { onValue, ref } from "firebase/database";

/* ---------- Types (aligned with your Live/Controller) ---------- */
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

/* ---------- Helpers / Defaults ---------- */
const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fb: string) => (n?.trim() ? n : fb);

const DEFAULT: ScoreState = {
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
    ...DEFAULT,
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

const COURT_IDS = ["court1", "court2", "court3", "court4", "court5"] as const;

/* =========================================================
 * Live All Courts (read-only)
 * =======================================================*/
export default function LiveAllPage() {
  const [states, setStates] = useState<Record<string, ScoreState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    const loadedOnce = new Set<string>();

    (async () => {
      try { await ensureAnonLogin(); } catch {}

      COURT_IDS.forEach((id) => {
        const path = `/courts/${id}`;
        const unsub = onValue(ref(db, path), (snap) => {
          const val = snap.val();
          const norm = normalize(val);
          setStates((prev) => ({ ...prev, [id]: norm }));

          // Turn off "Loading…" only after each court has delivered at least one snapshot
          if (!loadedOnce.has(id)) {
            loadedOnce.add(id);
            if (loadedOnce.size === COURT_IDS.length) setLoading(false);
          }
        });
        unsubs.push(unsub);
      });
    })();

    return () => { unsubs.forEach((fn) => fn?.()); };
  }, []);

  return (
    <main style={{ minHeight:"100vh", background:"var(--ink,#212A31)", color:"var(--cloud,#E9EDF3)", padding:"2rem 1.2rem" }}>
      <style>{`
        :root{ --ink:#212A31; --ink2:#0B1B2B; --muted:#748D92; --cloud:#D3D9D4; --accent:#124E66; }
        .wrap{ width:min(1400px, 96vw); margin:0 auto; }
        .title{ font-weight:800; font-size:clamp(22px,1.6vw + 16px,34px); letter-spacing:-.01em; margin: 0 0 .6rem 0; }
        .grid{
          display:grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 1rem;
        }
        @media (max-width: 980px){ .grid{ grid-template-columns: 1fr; } }
        .card{
          background: var(--ink2);
          border-radius: 16px;
          box-shadow: 0 6px 20px rgba(0,0,0,.25);
          border: 1px solid rgba(0,0,0,.15);
          padding: 1rem 1.1rem;
        }
        .header{
          display:flex; align-items:center; justify-content:space-between;
          padding-bottom:.6rem; border-bottom:1px solid rgba(211,217,212,.16);
        }
        .court{
          font-weight:800; color:var(--cloud);
          opacity: .95;
        }
        .pill{
          background: var(--muted); color:#0b1419; border-radius: 9999px; padding:.25rem .6rem; font-weight:800;
          font-size:.85rem;
        }
        .rows{ display:grid; gap:.8rem; margin-top:.8rem; }
        .row{ display:grid; grid-template-columns: 1fr 2.6rem minmax(0,1fr); gap:.6rem; align-items:center; }
        .teamline{ color:var(--cloud); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .serve{ text-align:center; }
        .gridScore{ display:grid; gap:.45rem; }
        .box{
          background:var(--muted); color:#0b1419; border-radius:10px; min-height:2.2em;
          display:flex; align-items:center; justify-content:center; font-weight:800;
        }
      `}</style>

      <div className="wrap">
        <h1 className="title">Live — All Courts</h1>
        {loading ? (
          <div style={{ opacity:.8 }}>Loading…</div>
        ) : (
          <section className="grid">
            {COURT_IDS.map((id) => (
              <CourtCard key={id} courtId={id} s={states[id] ?? DEFAULT} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function CourtCard({ courtId, s }: { courtId: typeof COURT_IDS[number]; s: ScoreState }) {
  const maxSets = useMemo(() => ((s?.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s?.meta?.bestOf]);
  const courtTitle = (s?.meta?.name || "").trim() ? s.meta.name : `Court ${courtId.slice(-1)}`;

  const Row = ({ side }: { side: Side }) => {
    const p = s.players;
    const sets = s.sets;
    const games = s.games;

    const p1a = nameOrLabel(p["1a"].name, "Player 1");
    const p1b = nameOrLabel(p["1b"].name, "Player 2");
    const p2a = nameOrLabel(p["2a"].name, "Player 3");
    const p2b = nameOrLabel(p["2b"].name, "Player 4");

    const line =
      side === "p1"
        ? `${flag(p["1a"].cc)} ${p1a} / ${flag(p["1b"].cc)} ${p1b}`
        : `${flag(p["2a"].cc)} ${p2a} / ${flag(p["2b"].cc)} ${p2b}`;

    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finished) return side === "p1" ? (sets.p1[i] ?? "") : (sets.p2[i] ?? "");
      if (i === finished) return side === "p1" ? (games.p1 ?? "") : (games.p2 ?? "");
      return "";
    });

    const points = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    return (
      <div className="row">
        <div className="teamline">{line}</div>
        <div className="serve">{s.server === side ? "🎾" : ""}</div>
        <div className="gridScore" style={{ gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => (
            <div key={i} className="box">{v}</div>
          ))}
          <div className="box">{String(points)}</div>
        </div>
      </div>
    );
  };

  return (
    <article className="card">
      <div className="header">
        <div className="court">{courtTitle}</div>
        <div className="pill" title={s.meta.golden ? "Golden point ON" : "Golden point OFF"}>
          {s.meta.golden ? "Golden: ON" : "Golden: OFF"}
        </div>
      </div>
      <div className="rows">
        <Row side="p1" />
        <Row side="p2" />
      </div>
    </article>
  );
}

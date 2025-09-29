// app/live/[courtId]/ClientLive.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

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

const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

const makeDefault = (): ScoreState => ({
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
});

function normalize(v: any): ScoreState {
  if (!v) return makeDefault();
  return {
    ...makeDefault(),
    ...v,
    meta: { name: v?.meta?.name ?? "", bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf },
  };
}

export default function ClientLive({ courtId }: { courtId: string }) {
  const [s, setS] = useState<ScoreState>(makeDefault());
  const [name, setName] = useState<string>("");

  const COURT_PATH = `/courts/${courtId}`;
  const META_NAME_PATH = `/courts/${courtId}/meta/name`;

  useEffect(() => {
    let u1 = () => {};
    let u2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      u1 = onValue(ref(db, COURT_PATH), (snap) => setS(normalize(snap.val())));
      u2 = onValue(ref(db, META_NAME_PATH), (snap) => setName(typeof snap.val() === "string" ? snap.val() : ""));
    })();
    return () => { u1?.(); u2?.(); };
  }, [COURT_PATH, META_NAME_PATH]);

  const maxSets = useMemo(() => ((s.meta?.bestOf ?? 3) === 5 ? 5 : 3), [s.meta?.bestOf]);

  const Row = ({ side }: { side: Side }) => {
    const p = s.players, sets = s.sets, games = s.games;

    const p1a = nameOrLabel(p["1a"].name, "Player 1");
    const p1b = nameOrLabel(p["1b"].name, "Player 2");
    const p2a = nameOrLabel(p["2a"].name, "Player 3");
    const p2b = nameOrLabel(p["2b"].name, "Player 4");

    const line = side === "p1"
      ? `${flag(p["1a"].cc)} ${p1a} / ${flag(p["1b"].cc)} ${p1b}`
      : `${flag(p["2a"].cc)} ${p2a} / ${flag(p["2b"].cc)} ${p2b}`;

    const finished = Math.max(sets.p1.length, sets.p2.length);
    const setCells = Array.from({ length: maxSets }).map((_, i) => {
      if (i < finished) return side === "p1" ? sets.p1[i] ?? "" : sets.p2[i] ?? "";
      if (i === finished) return side === "p1" ? games.p1 ?? "" : games.p2 ?? "";
      return "";
    });

    const points = s.tiebreak ? `TB ${s.tb[side]}` : s.points[side];

    const scoreBoxStyle: React.CSSProperties = {
      background: "var(--c-muted)",
      color: "#0b1419",
      borderRadius: 12,
      minHeight: "2.4em",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
    };

    return (
      <div className="row" style={{
        display: "grid",
        gridTemplateColumns: "1fr 3rem minmax(0,1fr)",
        gap: "1rem",
        alignItems: "center",
        fontSize: "1.28em",
      }}>
        <div className="teamline" style={{ color: "var(--c-cloud)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line}</div>
        <div className="serve" style={{ textAlign: "center" }}>{s.server === side ? "🎾" : ""}</div>
        <div className="grid" style={{ display: "grid", gap: ".6rem", gridTemplateColumns: `repeat(${maxSets + 1}, 1fr)` }}>
          {setCells.map((v, i) => (<div key={i} className="box" style={scoreBoxStyle}>{v}</div>))}
          <div className="box" style={scoreBoxStyle}>{String(points)}</div>
        </div>
      </div>
    );
  };

  return (
    <main className="wrap" style={{ minHeight:"100vh", background:"#212A31", display:"flex", alignItems:"center", justifyContent:"center", padding:"2vh 2vw" }}>
      <style>{`
        :root{ --c-ink:#212A31; --c-ink2:#0B1B2B; --c-muted:#748D92; --c-cloud:#D3D9D4; }
        .card{ width:min(1100px,95vw); background:var(--c-ink2); color:#fff; border-radius:16px; box-shadow:0 6px 20px rgba(0,0,0,.25); padding:1rem 1.25rem; }
        .header{ text-align:center; padding-bottom:.8rem; border-bottom:1px solid rgba(211,217,212,.16); }
        .court{ font-size:1.5em; font-weight:800; color:var(--c-cloud); }
      `}</style>
      <section className="card">
        <div className="header"><div className="court">{name || courtId.replace(/^\w/, c=>c.toUpperCase())}</div></div>
        <div style={{ display:"grid", gap:".9rem", marginTop:".9rem" }}>
          <Row side="p1" />
          <Row side="p2" />
        </div>
      </section>
    </main>
  );
}

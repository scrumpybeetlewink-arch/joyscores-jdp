"use client";
export const dynamic = "force-static";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

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
  golden?: boolean;
  ts?: number;
};

/** ---------- Countries ---------- */
const COUNTRIES: Array<[flag: string, name: string]> = [
  ["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇹🇭","Thailand"],["🇮🇩","Indonesia"],["🇵🇭","Philippines"],
  ["🇻🇳","Vietnam"],["🇮🇳","India"],["🇯🇵","Japan"],["🇰🇷","South Korea"],["🇨🇳","China"],
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇫🇷","France"],["🇩🇪","Germany"],
  ["🇪🇸","Spain"],["🇮🇹","Italy"],["🇧🇷","Brazil"],["🇦🇷","Argentina"],["🇿🇦","South Africa"],
  ["🏳️","(None)"]
];

/** ---------- Helpers ---------- */
const flag = (cc: string) => cc || "🏳️";
const nextPoint = (p: Point): Point =>
  p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : p === 40 ? "Ad" : "Ad";
const prevPoint = (p: Point): Point =>
  p === 15 ? 0 : p === 30 ? 15 : p === 40 ? 30 : 40;
const nameOrLabel = (n: string, fallback: string) => (n?.trim() ? n : fallback);

/** ---------- Defaults ---------- */
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
  golden: false,
  ts: undefined,
};

function normalize(v: any): ScoreState {
  const safe: ScoreState = {
    meta: {
      name: (v?.meta?.name ?? ""),
      bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf,
    },
    players: {
      "1a": { name: v?.players?.["1a"]?.name ?? "", cc: v?.players?.["1a"]?.cc ?? "🇲🇾" },
      "1b": { name: v?.players?.["1b"]?.name ?? "", cc: v?.players?.["1b"]?.cc ?? "🇲🇾" },
      "2a": { name: v?.players?.["2a"]?.name ?? "", cc: v?.players?.["2a"]?.cc ?? "🇲🇾" },
      "2b": { name: v?.players?.["2b"]?.name ?? "", cc: v?.players?.["2b"]?.cc ?? "🇲🇾" },
    },
    points: {
      p1: (v?.points?.p1 ?? 0) as Point,
      p2: (v?.points?.p2 ?? 0) as Point,
    },
    games: {
      p1: Number.isFinite(v?.games?.p1) ? v.games.p1 : 0,
      p2: Number.isFinite(v?.games?.p2) ? v.games.p2 : 0,
    },
    sets: {
      p1: Array.isArray(v?.sets?.p1) ? v.sets.p1 : [],
      p2: Array.isArray(v?.sets?.p2) ? v.sets.p2 : [],
    },
    tiebreak: !!v?.tiebreak,
    tb: {
      p1: Number.isFinite(v?.tb?.p1) ? v.tb.p1 : 0,
      p2: Number.isFinite(v?.tb?.p2) ? v.tb.p2 : 0,
    },
    server: v?.server === "p1" || v?.server === "p2" ? v.server : "p1",
    golden: !!v?.golden,
    ts: typeof v?.ts === "number" ? v.ts : undefined,
  };
  return safe;
}

/** =========================================================
 *  Page wrapper (Suspense) so useSearchParams is compliant
 *  =========================================================
 */
export default function ControllerPage() {
  return (
    <Suspense fallback={<main style={{padding:24,color:"#fff"}}>Loading…</main>}>
      <ControllerInner />
    </Suspense>
  );
}

function ControllerInner() {
  const params = useSearchParams();
  const courtId = params.get("court") || "court1";
  const COURT_PATH = `/courts/${courtId}`;
  const META_NAME_PATH = `/courts/${courtId}/meta/name`;

  const [s, setS] = useState<ScoreState>(defaultState);
  const [externalCourtName, setExternalCourtName] = useState<string>("");

  useEffect(() => {
    let unsubScore = () => {};
    let unsubName = () => {};

    (async () => {
      try { await ensureAnonLogin(); } catch {}
      const scoreRef = ref(db, COURT_PATH);
      const nameRef = ref(db, META_NAME_PATH);

      unsubScore = onValue(scoreRef, (snap) => {
        const v = snap.val();
        setS(v ? normalize(v) : defaultState);
      });

      unsubName = onValue(nameRef, (snap) => {
        const v = snap.val();
        setExternalCourtName(typeof v === "string" ? v : "");
      });
    })();

    return () => {
      unsubScore?.();
      unsubName?.();
    };
  }, [COURT_PATH, META_NAME_PATH]);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  }
  const clone = () => JSON.parse(JSON.stringify(s)) as ScoreState;

  function resetGameOneStep() {
    const n = clone();
    const { p1: g1, p2: g2 } = n.games;
    if (g1 > g2) n.games.p1 = Math.max(0, g1 - 1);
    else if (g2 > g1) n.games.p2 = Math.max(0, g2 - 1);
    if (n.tiebreak) n.tiebreak = false, n.tb = { p1: 0, p2: 0 };
    commit(n);
  }

  function resetPoints() {
    const n = clone();
    n.points = { p1: 0, p2: 0 };
    n.tiebreak = false;
    n.tb = { p1: 0, p2: 0 };
    commit(n);
  }

  function newMatch() {
    commit({
      ...defaultState,
      meta: { name: externalCourtName, bestOf: (s.meta?.bestOf ?? 3) as BestOf },
      server: "p1",
      ts: Date.now(),
    });
  }

  function toggleServer() {
    const n = clone();
    n.server = n.server === "p1" ? "p2" : "p1";
    commit(n);
  }

  async function toggleGolden() {
    const n = clone();
    n.golden = !n.golden;
    await commit(n);
  }

  async function updateBestOf(v: BestOf) {
    const n = clone();
    n.meta.bestOf = v;
    await commit(n);
  }

  /** ---------- Render ---------- */
  return (
    <div style={{ background: "var(--c-ink)", minHeight: "100vh" }}>
      {/* ... styles kept unchanged ... */}

      <div className="footerControls"
        style={{
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "0.9rem",
        }}
      >
        <button className="btn btn-danger btn-lg" onClick={resetGameOneStep}>Reset Game</button>
        <button className="btn btn-gold btn-lg" onClick={newMatch}>New Match</button>
        <button className="btn btn-lg" onClick={toggleServer}>Serve 🎾</button>
        <button className="btn btn-danger btn-lg" onClick={resetPoints}>Reset Points</button>
      </div>
    </div>
  );
}

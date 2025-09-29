"use client";
export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  ts?: number;
};

const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fb: string) => (n?.trim() ? n : fb);

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: { "1a": { name: "", cc: "🇲🇾" }, "1b": { name: "", cc: "🇲🇾" }, "2a": { name: "", cc: "🇲🇾" }, "2b": { name: "", cc: "🇲🇾" } },
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
    meta: { name: v?.meta?.name ?? "", bestOf: (v?.meta?.bestOf === 5 ? 5 : 3) as BestOf },
  };
}

export default function ControllerPage() {
  const params = useParams<{ courtId: string }>();
  const courtId = params?.courtId || "court1";
  const COURT_PATH = `/courts/${courtId}`;
  const META_NAME_PATH = `/courts/${courtId}/meta/name`;

  const [s, setS] = useState<ScoreState>(defaultState);
  const [courtName, setCourtName] = useState<string>("");

  useEffect(() => {
    let u1 = () => {}, u2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      u1 = onValue(ref(db, COURT_PATH), (snap) => setS(normalize(snap.val())));
      u2 = onValue(ref(db, META_NAME_PATH), (snap) => setCourtName(typeof snap.val() === "string" ? snap.val() : ""));
    })();
    return () => { u1?.(); u2?.(); };
  }, [COURT_PATH, META_NAME_PATH]);

  async function commit(next: ScoreState) {
    next.ts = Date.now();
    await set(ref(db, COURT_PATH), next);
  }

  // TODO: keep your addPoint, resetGame, newMatch, etc. logic here…
  // (no change from the working version you already had)

  return (
    <div className="wrap">
      {/* keep your existing Controller UI JSX here */}
      Controller UI for {courtName}
    </div>
  );
}

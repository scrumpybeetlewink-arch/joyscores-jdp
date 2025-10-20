"use client";
import { useEffect, useRef, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";
import type { ScoreState, Side, Point } from "./scoreTypes";

const DEFAULT: ScoreState = {
  meta: { name: "Court", bestOf: 3, goldenPoint: true },
  players: {
    "1a": { name: "P1A", cc: "ESP" },
    "1b": { name: "P1B", cc: "ESP" },
    "2a": { name: "P2A", cc: "FRA" },
    "2b": { name: "P2B", cc: "FRA" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  server: "p1",
};

export function useScoreSync(courtId: string) {
  const [state, setState] = useState<ScoreState>(DEFAULT);
  const readyRef = useRef(false);

  useEffect(() => {
    ensureAnonLogin?.();
    const r = ref(db, `courts/${courtId}/score`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      if (v) setState(v as ScoreState);
      else set(r, { ...DEFAULT, meta: { ...DEFAULT.meta, name: courtId } });
      readyRef.current = true;
    });
    return () => unsub();
  }, [courtId]);

  const write = (next: ScoreState) => {
    setState(next);
    return set(ref(db, `courts/${courtId}/score`), next);
  };

  const step = (p: Point): Point | "WIN" =>
    p === 0 ? 15 : p === 15 ? 30 : p === 30 ? 40 : "WIN";

  const incrementPoint = (side: Side) => {
    const s: ScoreState = JSON.parse(JSON.stringify(state));
    const other: Side = side === "p1" ? "p2" : "p1";

    // Golden Point at deuce
    if (s.meta.goldenPoint && s.points.p1 === 40 && s.points.p2 === 40) {
      s.games[side] += 1;
      s.points = { p1: 0, p2: 0 };
      s.last = { t: "game", side };
      return write(s);
    }

    // Normal advantage flow (when GP off)
    if (!s.meta.goldenPoint && s.points[other] === "Ad") {
      s.points[other] = 40;
      s.last = { t: "advBack", other };
      return write(s);
    }

    if (s.points[side] === "Ad") {
      s.games[side] += 1;
      s.points = { p1: 0, p2: 0 };
      s.last = { t: "game", side };
      return write(s);
    }

    const np = step(s.points[side]);
    if (np === "WIN") {
      s.games[side] += 1;
      s.points = { p1: 0, p2: 0 };
      s.last = { t: "game", side };
      return write(s);
    }

    if (!s.meta.goldenPoint && np === 40 && s.points[other] === 40) {
      s.points[side] = "Ad";
      s.last = { t: "adv", side };
      return write(s);
    }

    s.points[side] = np as Point;
    s.last = { t: "pt", side };
    return write(s);
  };

  const undo = () => {
    const s: ScoreState = JSON.parse(JSON.stringify(state));
    const last = s.last;
    if (!last) return;
    if (last.t === "pt") {
      const side = last.side as Side;
      const p = s.points[side];
      if (p === 15) s.points[side] = 0;
      else if (p === 30) s.points[side] = 15;
      else if (p === 40) s.points[side] = 30;
      else if (p === "Ad") s.points[side] = 40;
    } else if (last.t === "advBack") {
      const other = last.other as Side;
      s.points[other] = "Ad";
    } else if (last.t === "adv") {
      const side = last.side as Side;
      s.points[side] = 40;
    } else if (last.t === "game") {
      const side = last.side as Side;
      s.games[side] = Math.max(0, s.games[side] - 1);
      s.points = { p1: 40, p2: 40 };
    }
    s.last = undefined;
    return write(s);
  };

  const swapSides = () => {
    const s: ScoreState = JSON.parse(JSON.stringify(state));
    [s.players["1a"], s.players["2a"]] = [s.players["2a"], s.players["1a"]];
    [s.players["1b"], s.players["2b"]] = [s.players["2b"], s.players["1b"]];
    [s.games.p1, s.games.p2] = [s.games.p2, s.games.p1];
    [s.points.p1, s.points.p2] = [s.points.p2, s.points.p1];
    [s.sets.p1, s.sets.p2] = [s.sets.p2, s.sets.p1];
    s.server = s.server === "p1" ? "p2" : "p1";
    return write(s);
  };

  const resetGames = () => {
    const s: ScoreState = JSON.parse(JSON.stringify(state));
    s.games = { p1: 0, p2: 0 };
    s.points = { p1: 0, p2: 0 };
    s.last = undefined;
    return write(s);
  };

  const resetMatch = () => {
    const s: ScoreState = JSON.parse(JSON.stringify(state));
    s.points = { p1: 0, p2: 0 };
    s.games = { p1: 0, p2: 0 };
    s.sets = { p1: [], p2: [] };
    s.last = undefined;
    return write(s);
  };

  const toggleGoldenPoint = () => {
    const s: ScoreState = JSON.parse(JSON.stringify(state));
    s.meta.goldenPoint = !s.meta.goldenPoint;
    return write(s);
  };

  return {
    state,
    ready: readyRef.current,
    actions: { incrementPoint, undo, swapSides, resetGames, resetMatch, toggleGoldenPoint },
  };
}

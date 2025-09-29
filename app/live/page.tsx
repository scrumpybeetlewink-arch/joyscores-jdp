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
};

const COURT_PATH = "/courts/court1";
const META_NAME_PATH = "/courts/court1/meta/name";

const flag = (cc: string) => cc || "🏳️";
const nameOrLabel = (n: string, fb: string) => (n?.trim() ? n : fb);

const defaultState: ScoreState = {
  meta: { name: "", bestOf: 3 },
  players: { "1a": { name: "", cc: "🇲🇾" }, "1b": { name: "", cc: "🇲🇾" }, "2a": { name: "", cc: "🇲🇾" }, "2b": { name: "", cc: "🇲🇾" } },
  points: { p1: 0, p2: 0 }, games: { p1: 0, p2: 0 }, sets: { p1: [], p2: [] },
  tiebreak: false, tb: { p1: 0, p2: 0 }, server: "p1"
};

export default function LivePage() {
  const [s, setS] = useState<ScoreState>(defaultState);
  const [courtName, setCourtName] = useState("");

  useEffect(() => {
    let u1 = () => {}, u2 = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      u1 = onValue(ref(db, COURT_PATH), (snap)=>setS({...defaultState,...snap.val()}));
      u2 = onValue(ref(db, META_NAME_PATH), (snap)=>{
        const v = snap.val(); setCourtName(typeof v==="string"?v:"");
      });
    })();
    return ()=>{u1();u2();};
  }, []);

  const maxSets = useMemo(()=>s.meta.bestOf===5?5:3,[s.meta.bestOf]);

  const Row = ({ side }: {side: Side}) => {
    const players = s.players, sets=s.sets, games=s.games;
    const team = side==="p1"
      ? `${flag(players["1a"].cc)} ${nameOrLabel(players["1a"].name,"Player 1")} / ${flag(players["1b"].cc)} ${nameOrLabel(players["1b"].name,"Player 2")}`
      : `${flag(players["2a"].cc)} ${nameOrLabel(players["2a"].name,"Player 3")} / ${flag(players["2b"].cc)} ${nameOrLabel(players["2b"].name,"Player 4")}`;
    const finished=Math.max(sets.p1.length,sets.p2.length);
    const setCells=Array.from({length:maxSets}).map((_,i)=>{
      if(i<finished) return side==="p1"?sets.p1[i]??"":sets.p2[i]??"";
      if(i===finished) return side==="p1"?games.p1:games.p2;
      return "";
    });
    const points=s.tiebreak?`TB ${s.tb[side]}`:s.points[side];
    return(
      <div className="row" style={{display:"grid",gridTemplateColumns:"1fr 3rem min

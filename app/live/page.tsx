"use client";
import React, { useEffect, useState, Suspense } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";
import { getCourtId } from "@/app/shared/getCourtId";

export default function LivePage(){
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ setMounted(true); ensureAnonLogin(); },[]);
  if (!mounted) return null;
  return (
    <Suspense fallback={<main style={{padding:24,color:"#fff"}}>Loading…</main>}>
      <LiveInner />
    </Suspense>
  );
}

function LiveInner(){
  const [courtId, setCourtId] = useState<"court1"|"court2"|"court3"|"court4"|"court5">("court1");
  useEffect(()=>{ setCourtId(getCourtId()); },[]);

  const COURT_PATH = `/courts/${courtId}`;
  const SCORE_PATH = `${COURT_PATH}/score`;

  const [score, setScore] = useState<{p1:number;p2:number}>({p1:0,p2:0});
  useEffect(()=>{
    const off = onValue(ref(db, SCORE_PATH), snap=>{
      const v = snap.val();
      setScore({ p1: v?.p1 || 0, p2: v?.p2 || 0 });
    });
    return ()=>off();
  }, [SCORE_PATH]);

  return (
    <main className="livewrap">
      <header className="header">
        <div className="brand">
          <div className="logo">JOY<strong>SCORES</strong></div>
          <span className="tag">{courtId.toUpperCase()} · Live</span>
        </div>
        <div className="last">Firebase</div>
      </header>

      <div className="teamline">Player 1</div>
      <div className="bigpts">{score.p1}</div>
      <div className="teamline">Player 2</div>
      <div className="bigpts">{score.p2}</div>
    </main>
  );
}

"use client";
import React, { useEffect, useState, Suspense } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, update, remove } from "firebase/database";
import { getCourtId } from "@/app/shared/getCourtId";

export default function ControllerPage(){
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ setMounted(true); ensureAnonLogin(); },[]);
  if (!mounted) return null;
  return (
    <Suspense fallback={<main style={{padding:24,color:"#fff"}}>Loading…</main>}>
      <ControllerInner />
    </Suspense>
  );
}

function ControllerInner(){
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

  const inc = (k:"p1"|"p2") => update(ref(db, SCORE_PATH), { [k]: (score[k]||0)+1 });
  const dec = (k:"p1"|"p2") => update(ref(db, SCORE_PATH), { [k]: Math.max(0,(score[k]||0)-1) });
  const reset = () => remove(ref(db, COURT_PATH));

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="logo">JOY<strong>SCORES</strong></div>
          <span className="tag">{courtId.toUpperCase()} · Controller</span>
        </div>
        <div className="last">Firebase</div>
      </header>

      <main className="card">
        <section className="row" style={{display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center"}}>
          <div><strong>Player 1</strong></div>
          <button className="btn" onClick={()=>dec("p1")}>-</button>
          <button className="btn" onClick={()=>inc("p1")}>+</button>
        </section>
        <section className="row" style={{display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center"}}>
          <div><strong>Player 2</strong></div>
          <button className="btn" onClick={()=>dec("p2")}>-</button>
          <button className="btn" onClick={()=>inc("p2")}>+</button>
        </section>

        <div className="row" style={{marginTop:12, display:"flex", gap:10}}>
          <button className="btn danger" onClick={reset}>Reset Court</button>
        </div>
      </main>
    </div>
  );
}

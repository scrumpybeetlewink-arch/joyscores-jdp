"use client";

import { useEffect, useState, Suspense } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type CourtId = "court1" | "court2" | "court3" | "court4" | "court5";

export default function IndexPage() {
  return (
    <Suspense fallback={null}>
      <IndexInner />
    </Suspense>
  );
}

function IndexInner() {
  const courts: CourtId[] = ["court1", "court2", "court3", "court4", "court5"];
  const [court, setCourt] = useState<CourtId>("court1");
  const [name, setName] = useState("Centre Court");

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, `/courts/${court}/meta/name`), (snap) => {
        setName(typeof snap.val() === "string" ? snap.val() : "Centre Court");
      });
    })();
    return () => unsub?.();
  }, [court]);

  async function save() {
    await set(ref(db, `/courts/${court}/meta/name`), name || "Centre Court");
  }
  async function reset() {
    await set(ref(db, `/courts/${court}/meta/name`), "Centre Court");
  }

  return (
    <main style={{minHeight:"100vh",background:"#121a21",color:"#e9edf3",display:"grid",placeItems:"center",padding:"6vh 4vw"}}>
      <section style={{width:"min(900px,95vw)",background:"#0E1B24",border:"1px solid rgba(255,255,255,.06)",borderRadius:18,boxShadow:"0 18px 60px rgba(0,0,0,.35)",padding:"28px"}}>
        <div style={{marginBottom:16}}>
          <label style={{display:"block",opacity:.8,marginBottom:6}}>Select court</label>
          <select
            value={court}
            onChange={(e)=>setCourt(e.target.value as CourtId)}
            style={{width:"100%",height:48,borderRadius:12,border:"1px solid #2a323a",background:"#13202A",color:"#E6EDF3",padding:"0 14px",fontSize:18}}
          >
            {courts.map(c=><option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{display:"block",opacity:.8,marginBottom:6}}>Court name</label>
          <input
            value={name}
            onChange={(e)=>setName(e.target.value)}
            placeholder="Centre Court"
            style={{width:"100%",height:48,borderRadius:12,border:"1px solid #2a323a",background:"#13202A",color:"#E6EDF3",padding:"0 14px",fontSize:18}}
          />
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <button onClick={save} style={{height:48,borderRadius:14,background:"#0D6078",color:"#fff",fontWeight:800}}>Save</button>
          <button onClick={reset} style={{height:48,borderRadius:14,background:"#274956",color:"#fff",fontWeight:800}}>Reset</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <a href={`/controller?court=${court}`} style={{textDecoration:"none",height:48,borderRadius:14,background:"#2A5B6C",color:"#fff",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>Controller</a>
          <a href={`/live?court=${court}`} style={{textDecoration:"none",height:48,borderRadius:14,background:"#6C8086",color:"#0b1419",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>Live</a>
        </div>
      </section>
    </main>
  );
}

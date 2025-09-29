// app/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type BestOf = 3 | 5;
type CourtId = "court1" | "court2" | "court3" | "court4" | "court5";

export const dynamic = "force-static";

function Inner() {
  const courts: CourtId[] = ["court1", "court2", "court3", "court4", "court5"];
  const [court, setCourt] = useState<CourtId>("court1");
  const namePath = useMemo(() => `/courts/${court}/meta/name`, [court]);

  const [name, setName] = useState("Centre Court");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(ref(db, namePath), (snap) => {
        const v = snap.val();
        setName(typeof v === "string" ? v : "Centre Court");
        setLoading(false);
      });
    })();
    return () => unsub?.();
  }, [namePath]);

  async function save() {
    await set(ref(db, namePath), name || "Centre Court");
  }
  async function reset() {
    await set(ref(db, namePath), "Centre Court");
  }

  const linkQ = `?court=${court}`;

  return (
    <main style={{minHeight:"100vh",background:"#121a21",color:"#e9edf3",display:"grid",placeItems:"center",padding:"6vh 4vw"}}>
      <section style={{width:"min(900px,95vw)",background:"#0E1B24",border:"1px solid rgba(255,255,255,.06)",borderRadius:18,boxShadow:"0 18px 60px rgba(0,0,0,.35)",padding:"28px 28px 24px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,alignItems:"end",marginBottom:12}}>
          <div>
            <div style={{opacity:.85,marginBottom:6}}>Select court</div>
            <select
              value={court}
              onChange={(e)=>setCourt(e.target.value as CourtId)}
              style={{width:"100%",height:48,borderRadius:12,border:"1px solid #2a323a",background:"#13202A",color:"#E6EDF3",padding:"0 14px",fontSize:18}}
            >
              {courts.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <div style={{opacity:.85,marginBottom:6}}>Court name</div>
            <input
              placeholder="Centre Court"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              style={{width:"100%",height:48,borderRadius:12,border:"1px solid #2a323a",background:"#13202A",color:"#E6EDF3",padding:"0 14px",fontSize:18}}
            />
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,margin:"12px 0"}}>
          <button onClick={save} style={{height:52,borderRadius:14,border:"1px solid rgba(255,255,255,.06)",background:"linear-gradient(180deg,#0D6078,#0C4F67)",color:"#fff",fontWeight:800,letterSpacing:.2,fontSize:18}}>
            Save
          </button>
          <button onClick={reset} style={{height:52,borderRadius:14,border:"1px solid rgba(255,255,255,.06)",background:"linear-gradient(180deg,#274956,#203946)",color:"#fff",fontWeight:800,letterSpacing:.2,fontSize:18}}>
            Reset
          </button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <a href={`/controller${linkQ}`} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",height:52,borderRadius:14,background:"#2A5B6C",color:"#fff",fontWeight:800,letterSpacing:.2,fontSize:18,textDecoration:"none",border:"1px solid rgba(255,255,255,.08)"}}>
            Controller
          </a>
          <a href={`/live${linkQ}`} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",height:52,borderRadius:14,background:"#6C8086",color:"#0b1419",fontWeight:800,letterSpacing:.2,fontSize:18,textDecoration:"none",border:"1px solid rgba(255,255,255,.08)"}}>
            Live
          </a>
        </div>

        <div style={{opacity:.6,fontSize:12,marginTop:16}}>
          RTDB path: <code>/courts/{court}</code> {loading ? "(loading…)" : ""}
        </div>
      </section>
    </main>
  );
}

export default function Page(){
  return <Suspense fallback={null}><Inner/></Suspense>;
}

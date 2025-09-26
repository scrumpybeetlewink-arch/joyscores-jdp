// @ts-nocheck
"use client";
export const dynamic = "force-static";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

const PATH = "/courts/court1";

export default function IndexPage() {
  const [name, setName] = useState("Centre Court");
  const nameRef = ref(db, `${PATH}/meta/name`);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsub = onValue(nameRef, (snap) => {
        const v = snap.val();
        setName(typeof v === "string" && v.trim() ? v : "Centre Court");
      });
    })();
    return () => unsub?.();
  }, []);

  async function save(n: string) {
    await set(nameRef, (n && n.trim()) ? n.trim() : "Centre Court");
  }
  async function reset() {
    await set(nameRef, "Centre Court");
  }

  return (
    <main style={{minHeight:"100vh",background:"#121a21",color:"#e9edf3",display:"grid",placeItems:"center",padding:"6vh 4vw"}}>
      <section style={{width:"min(900px,95vw)",background:"#0E1B24",border:"1px solid rgba(255,255,255,.06)",borderRadius:18,boxShadow:"0 18px 60px rgba(0,0,0,.35)",padding:"28px 28px 24px"}}>
        <div style={{textAlign:"center",fontWeight:900,letterSpacing:1,marginBottom:14,fontSize:"clamp(26px,3vw,36px)"}}>
          CENTRE COURT
        </div>

        <hr style={{border:"none",height:1,background:"rgba(255,255,255,.12)",margin:"0 0 18px"}} />

        <label style={{display:"block",opacity:.8,marginBottom:8}}>Court name</label>
        <input
          placeholder="Centre Court"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          style={{width:"100%",height:48,borderRadius:12,border:"1px solid #2a323a",background:"#13202A",color:"#E6EDF3",padding:"0 14px",fontSize:18}}
        />

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,margin:"16px 0 12px"}}>
          <button onClick={()=>save(name)} style={btnPrimary}>Save</button>
          <button onClick={reset} style={btnPrimaryMuted}>Reset</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <a href="/controller" style={btnPill}>Controller</a>
          <a href="/live" style={btnPillMuted}>Live</a>
        </div>

        <div style={{opacity:.6,fontSize:12,marginTop:16}}>RTDB path: <code>{PATH}</code></div>
      </section>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  height:52,borderRadius:14,border:"1px solid rgba(255,255,255,.06)",background:"linear-gradient(180deg,#0D6078,#0C4F67)",
  color:"#fff",fontWeight:800,letterSpacing:.2,fontSize:18
};
const btnPrimaryMuted: React.CSSProperties = {
  ...btnPrimary, background:"linear-gradient(180deg,#274956,#203946)"
};
const btnPill: React.CSSProperties = {
  display:"inline-flex",alignItems:"center",justifyContent:"center",height:52,borderRadius:14,
  background:"#2A5B6C",color:"#fff",fontWeight:800,letterSpacing:.2,fontSize:18,textDecoration:"none",
  border:"1px solid rgba(255,255,255,.08)"
};
const btnPillMuted: React.CSSProperties = { ...btnPill, background:"#6C8086", color:"#0b1419" };

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

  return (
    <main style={{minHeight:"100vh",background:"#0e0f12",display:"grid",placeItems:"center",padding:"6vh 4vw",color:"#e9edf3"}}>
      <section style={{width:"min(720px,95vw)",background:"#14161b",borderRadius:16,boxShadow:"0 10px 30px rgba(0,0,0,.35)",padding:24}}>
        <h1 style={{marginTop:0,marginBottom:12}}>JoyScores — Index</h1>
        <p style={{opacity:.85,marginTop:0}}>RTDB path: <code>{PATH}</code></p>

        <div style={{display:"grid",gap:12,marginTop:16}}>
          <label style={{opacity:.9}}>Court name</label>
          <input
            value={name}
            onChange={(e)=>setName(e.target.value)}
            onBlur={()=>save(name)}
            placeholder="Centre Court"
            style={{height:42,borderRadius:10,border:"1px solid #272b33",padding:"0 12px",background:"#1a1d23",color:"#e9edf3"}}
          />
          <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap"}}>
            <a href="/controller" style={btn}>Open Controller</a>
            <a href="/live" style={btn}>Open Live</a>
          </div>
        </div>
      </section>
    </main>
  );
}

const btn: React.CSSProperties = {
  display:"inline-flex",alignItems:"center",justifyContent:"center",
  padding:"10px 14px",background:"#124E66",color:"#fff",borderRadius:10,
  fontWeight:700,textDecoration:"none"
};

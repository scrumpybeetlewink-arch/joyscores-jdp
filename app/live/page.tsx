export const dynamic = "force-static";

"use client";
import { useEffect } from "react";

export default function LiveIndexRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") window.location.replace("/live/court1");
  }, []);
  return (
    <main style={{minHeight:"60vh",display:"grid",placeItems:"center",color:"#e9edf3",background:"#121a21"}}>
      <p>Loading live…</p>
    </main>
  );
}

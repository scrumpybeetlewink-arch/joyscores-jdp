export const dynamic = "force-static";

// A tiny client redirect so /controller goes to /controller/court1
"use client";
import { useEffect } from "react";

export default function ControllerIndexRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") window.location.replace("/controller/court1");
  }, []);
  return (
    <main style={{minHeight:"60vh",display:"grid",placeItems:"center",color:"#e9edf3",background:"#121a21"}}>
      <p>Loading controller…</p>
    </main>
  );
}

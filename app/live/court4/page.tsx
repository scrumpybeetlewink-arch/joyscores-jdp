"use client";
import { useEffect } from "react";
export default function Page() {
  useEffect(() => { if (typeof window !== "undefined") window.location.replace("/live/?court=court4"); }, []);
  return <div style={padding:24}>Redirecting to <code>/live/?court=court4</code>…</div>;
}

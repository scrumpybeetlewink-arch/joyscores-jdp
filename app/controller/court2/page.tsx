"use client";
import { useEffect } from "react";
export default function Page() {
  useEffect(() => { if (typeof window !== "undefined") window.location.replace("/controller/?courtId=court2"); }, []);
  return <div style={padding:24}>Redirecting to <code>/controller/?courtId=court2</code>…</div>;
}

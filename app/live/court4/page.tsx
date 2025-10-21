"use client";
import { useEffect } from "react";
const TARGET = "/live/?courtId=court4";
export default function Page() {
  useEffect(() => { if (typeof window !== "undefined") window.location.replace(TARGET); }, []);
  return <div style={{ padding: 24 }}><p>Redirecting to <code>/live/?courtId=court4</code>…</p></div>;
}

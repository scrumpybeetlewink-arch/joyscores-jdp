"use client";
import { useEffect } from "react";
const TARGET = "/controller/?courtId=court5";
export default function Page() {
  useEffect(() => { if (typeof window !== "undefined") window.location.replace(TARGET); }, []);
  return <div style={{ padding: 24 }}><p>Redirecting to <code>/controller/?courtId=court5</code>…</p></div>;
}

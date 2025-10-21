"use client";
import { useEffect } from "react";
const TARGET = "/controller/?courtId=court3";
export default function Page() {
  useEffect(() => { if (typeof window !== "undefined") window.location.replace(TARGET); }, []);
  return <div style={{ padding: 24 }}><p>Redirecting to <code>/controller/?courtId=court3</code>…</p></div>;
}

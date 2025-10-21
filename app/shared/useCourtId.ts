"use client";

/**
 * Safe courtId resolver that DOES NOT import next/navigation.
 * Works in client components and SSR/export:
 * 1) ?courtId=courtX
 * 2) /controller/courtX/ or /live/courtX/ (alias path)
 * 3) localStorage("lastCourtId")
 * 4) "court1"
 */
import { useEffect, useMemo, useState } from "react";

function readFromLocation(): string | null {
  if (typeof window === "undefined") return null;

  // query string
  try {
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get("courtId");
    if (q) return q.toLowerCase();
  } catch {}

  // alias path: /controller/court3/ or /live/court5/
  try {
    const m =
      window.location.pathname.match(/(?:controller|live)\/(court[1-5])\/?$/i) ||
      window.location.pathname.match(/\/(court[1-5])\/?$/i);
    if (m && m[1]) return m[1].toLowerCase();
  } catch {}

  return null;
}

export function useCourtId(): string {
  // default for SSR/export; will update on client
  const [resolved, setResolved] = useState<string>("court1");

  // recompute when pathname/search changes
  const snapshot = useMemo(() => {
    if (typeof window === "undefined") return { path: "", search: "" };
    return { path: window.location.pathname, search: window.location.search };
  }, [typeof window !== "undefined" ? window.location.pathname : "", typeof window !== "undefined" ? window.location.search : ""]);

  useEffect(() => {
    const fromLoc = readFromLocation();
    const fromLS = typeof window !== "undefined" ? window.localStorage.getItem("lastCourtId") : null;
    const next = (fromLoc || fromLS || "court1").toLowerCase();
    setResolved(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lastCourtId", next);
    }
  }, [snapshot.path, snapshot.search]);

  return resolved;
}

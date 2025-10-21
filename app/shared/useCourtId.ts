
"use client";

/**
 * Safe courtId resolver without next/navigation.
 * Order: ?courtId -> /controller/courtX or /live/courtX -> localStorage -> "court1"
 */
import { useEffect, useMemo, useState } from "react";

function readFromLocation(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get("courtId");
    if (q) return q.toLowerCase();
  } catch {}

  try {
    const m =
      window.location.pathname.match(/(?:controller|live)\/(court[1-5])\/?$/i) ||
      window.location.pathname.match(/\/(court[1-5])\/?$/i);
    if (m && m[1]) return m[1].toLowerCase();
  } catch {}

  return null;
}

export function useCourtId(): string {
  const [resolved, setResolved] = useState<string>("court1");

  const snapshot = useMemo(() => {
    if (typeof window === "undefined") return { path: "", search: "" };
    return { path: window.location.pathname, search: window.location.search };
  }, [
    typeof window !== "undefined" ? window.location.pathname : "",
    typeof window !== "undefined" ? window.location.search : "",
  ]);

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

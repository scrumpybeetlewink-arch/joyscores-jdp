"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export function useCourtId(): string {
  const searchParams = useSearchParams();
  const [resolved, setResolved] = useState<string>("court1");

  const queryId = searchParams?.get("courtId") || null;

  const pathId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const m =
      window.location.pathname.match(/(?:controller|live)\/(court[1-5])\/?$/i) ||
      window.location.pathname.match(/\/(court[1-5])\/?$/i);
    return m?.[1] ?? null;
  }, [typeof window !== "undefined" ? window.location.pathname : ""]);

  useEffect(() => {
    const ls = typeof window !== "undefined" ? window.localStorage.getItem("lastCourtId") : null;
    const next = (queryId || pathId || ls || "court1").toLowerCase();
    setResolved(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lastCourtId", next);
    }
  }, [queryId, pathId]);

  return resolved;
}

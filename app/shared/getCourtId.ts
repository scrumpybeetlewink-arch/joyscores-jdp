"use client";

export function getCourtId() {
  if (typeof window === "undefined") return "court1";
  const query = new URLSearchParams(window.location.search);
  const q = query.get("court");
  return q && /^court[1-5]$/i.test(q) ? q.toLowerCase() : "court1";
}

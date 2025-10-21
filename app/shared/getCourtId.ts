"use client";
export function getCourtId(defaultId: "court1"|"court2"|"court3"|"court4"|"court5" = "court1") {
  if (typeof window === "undefined") return defaultId;
  const q = new URLSearchParams(window.location.search).get("court");
  const id = (q || defaultId).toLowerCase();
  return (["court1","court2","court3","court4","court5"].includes(id) ? (id as any) : defaultId);
}

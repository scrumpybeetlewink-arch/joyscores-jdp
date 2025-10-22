"use client";
export function getCourtId(deflt: "court1"|"court2"|"court3"|"court4"|"court5" = "court1") {
  if (typeof window === "undefined") return deflt;
  const q = new URLSearchParams(window.location.search).get("court");
  const v = (q || deflt).toLowerCase();
  return (["court1","court2","court3","court4","court5"].includes(v) ? (v as any) : deflt);
}

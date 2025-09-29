// app/live/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-static";

export default function LiveIndexRedirect() {
  const r = useRouter();
  useEffect(() => { r.replace("/live/court1"); }, [r]);
  return null;
}

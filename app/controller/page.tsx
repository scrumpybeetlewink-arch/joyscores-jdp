// app/controller/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-static";

export default function ControllerIndexRedirect() {
  const r = useRouter();
  useEffect(() => { r.replace("/controller/court1"); }, [r]);
  return null;
}

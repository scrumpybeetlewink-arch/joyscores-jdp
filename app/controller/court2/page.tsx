"use client";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/controller/?court=court2");
    }
  }, []);

  return (
    <p>Redirecting to <code>/controller/?court=court2</code>…</p>
  );
}

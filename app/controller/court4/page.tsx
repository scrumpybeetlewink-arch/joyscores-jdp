"use client";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/controller/?court=court4");
    }
  }, []);

  return (
    <p>Redirecting to <code>/controller/?court=court4</code>…</p>
  );
}

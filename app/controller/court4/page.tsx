"use client";

export default function Page() {
  if (typeof window !== "undefined") {
    window.location.replace("/controller/?court=court4");
  }
  return null;
}

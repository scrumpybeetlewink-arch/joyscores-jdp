"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ScoreboardController from "./ui";

export default function ControllerPage() {
  return (
    <Suspense fallback={null}>
      <ControllerInner />
    </Suspense>
  );
}

function ControllerInner() {
  const sp = useSearchParams();
  const courtId = sp.get("court") || "court1";
  return <ScoreboardController courtId={courtId} />;
}

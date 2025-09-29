"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ScoreboardLive from "./ui";

export default function LivePage() {
  return (
    <Suspense fallback={null}>
      <LiveInner />
    </Suspense>
  );
}

function LiveInner() {
  const sp = useSearchParams();
  const courtId = sp.get("court") || "court1";
  return <ScoreboardLive courtId={courtId} />;
}

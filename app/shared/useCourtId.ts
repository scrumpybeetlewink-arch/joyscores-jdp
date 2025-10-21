// app/shared/useCourtId.ts
"use client";

import { useEffect, useState } from "react";

export function useCourtId(defaultId: string = "court1") {
  const [court, setCourt] = useState(defaultId);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("court");
    setCourt(q && /^court[1-5]$/i.test(q) ? q.toLowerCase() : defaultId);
  }, [defaultId]);
  return court;
}

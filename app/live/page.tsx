"use client";
export const dynamic = "force-static";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /live -> /live/court1
 */
export default function LiveIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/live/court1");
  }, [router]);
  return null;
}

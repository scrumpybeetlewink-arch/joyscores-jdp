"use client";
export const dynamic = "force-static";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /controller -> /controller/court1
 */
export default function ControllerIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/controller/court1");
  }, [router]);
  return null;
}

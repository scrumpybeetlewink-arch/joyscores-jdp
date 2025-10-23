"use client";
export const dynamic = "force-static";
const COURT_ID = "court4";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, off, update } from "firebase/database";

export default function ControllerPage() {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    ensureAnonLogin();
    const base = ref(db, `courts/${court4}`);
    const unsub = onValue(base, snap => setState(snap.val()));
    return () => off(base);
  }, []);

  return <main style={{ padding: 24 }}>Controller court4</main>;
}

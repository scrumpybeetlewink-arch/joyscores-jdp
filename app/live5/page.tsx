export const dynamic = "force-static";
const COURT_ID = "court5";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, off } from "firebase/database";

export default function LivePage() {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    ensureAnonLogin();
    const base = ref(db, `courts/${court5}`);
    const unsub = onValue(base, snap => setState(snap.val()));
    return () => off(base);
  }, []);

  return <main style={{ padding: 24 }}>Live court5</main>;
}

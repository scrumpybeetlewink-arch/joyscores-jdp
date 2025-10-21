"use client";
import { useEffect, useState } from "react";
export default function ResetSW() {
  const [done, setDone] = useState(false);
  useEffect(() => { (async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
    } catch {}
    setDone(true);
  })(); }, []);
  return <main className="min-h-screen bg-slate-900 text-white p-6 flex items-center justify-center">
    <div>{done ? "Service worker & caches cleared. Reload the site." : "Clearing…"}</div>
  </main>;
}

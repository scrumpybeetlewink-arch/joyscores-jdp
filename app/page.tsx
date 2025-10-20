"use client";
import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type CourtId = "court1" | "court2" | "court3" | "court4" | "court5";
const COURTS: CourtId[] = ["court1", "court2", "court3", "court4", "court5"];

export default function HomePage() {
  const [names, setNames] = useState<Record<CourtId, string>>({
    court1: "Court 1",
    court2: "Court 2",
    court3: "Court 3",
    court4: "Court 4",
    court5: "Court 5",
  });

  useEffect(() => {
    ensureAnonLogin?.();
    const unsubs = COURTS.map((cid) => {
      const r = ref(db, `courts/${cid}/score/meta/name`);
      return onValue(r, (snap) => {
        const v = snap.val();
        if (typeof v === "string" && v.trim()) {
          setNames((prev) => ({ ...prev, [cid]: v }));
        }
      });
    });
    return () => unsubs.forEach((u) => u && u());
  }, []);

  const saveName = async (cid: CourtId, name: string) => {
    const clean = (name || "").trim() || cid;
    setNames((prev) => ({ ...prev, [cid]: clean }));
    await set(ref(db, `courts/${cid}/score/meta/name`), clean);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>JoyScores — Courts</h1>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
        {COURTS.map((cid) => (
          <li key={cid} style={{ background: "var(--panel)", borderRadius: 12, padding: 16, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 6 }}>{cid}</div>
            <div style={{ fontSize: 20, marginBottom: 12 }}>{names[cid]}</div>

            <label style={{ fontSize: 12, opacity: 0.8, display: "block", marginBottom: 6 }}>Edit court name</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={names[cid]}
                onChange={(e) => setNames((prev) => ({ ...prev, [cid]: e.target.value }))}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)" }}
              />
              <button
                onClick={() => saveName(cid, names[cid])}
                style={{ padding: "8px 12px", borderRadius: 8, background: "var(--accent)", color: "var(--bg)", border: "none" }}
              >
                Save
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <a href={`/controller/${cid}/`} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--accent)", color: "var(--bg)", textDecoration: "none" }}>
                Controller
              </a>
              <a href={`/live/${cid}/`} style={{ padding: "8px 12px", border: "1px solid var(--line)", color: "var(--text)", textDecoration: "none", borderRadius: 8 }}>
                Live
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

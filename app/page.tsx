"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set, remove } from "firebase/database";

const COURTS = ["court1", "court2", "court3", "court4", "court5"];

export default function IndexPage() {
  const [court, setCourt] = useState<string>("court1");
  const [name, setName] = useState<string>("Centre Court");

  useEffect(() => {
    let off = () => {};
    (async () => {
      try {
        await ensureAnonLogin();
      } catch {}
      const metaRef = ref(db, `/courts/${court}/meta/name`);
      off = onValue(metaRef, (snap) => {
        const v = snap.val();
        setName(typeof v === "string" && v.trim() ? v : "Centre Court");
      });
    })();
    return () => off?.();
  }, [court]);

  async function save() {
    await set(ref(db, `/courts/${court}/meta/name`), name.trim() || "Centre Court");
  }
  async function reset() {
    await remove(ref(db, `/courts/${court}`));
    await set(ref(db, `/courts/${court}/meta/name`), name.trim() || "Centre Court");
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "6vh 4vw" }}>
      <section
        style={{
          width: "min(900px,95vw)",
          background: "#0E1B24",
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 18,
          boxShadow: "0 18px 60px rgba(0,0,0,.35)",
          padding: 28,
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: 1,
            marginBottom: 14,
            fontSize: "clamp(26px,3vw,36px)",
          }}
        >
          CENTRE COURT
        </div>

        <hr style={{ border: "none", height: 1, background: "rgba(255,255,255,.12)", margin: "0 0 18px" }} />

        <label style={{ display: "block", opacity: 0.8, marginBottom: 8 }}>Court</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <select
            aria-label="Court"
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            style={{
              height: 48,
              borderRadius: 12,
              border: "1px solid #2a323a",
              background: "#13202A",
              color: "#E6EDF3",
              padding: "0 12px",
              fontSize: 16,
            }}
          >
            {COURTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            placeholder="Centre Court"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1px solid #2a323a",
              background: "#13202A",
              color: "#E6EDF3",
              padding: "0 14px",
              fontSize: 18,
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 0 12px" }}>
          <button
            onClick={save}
            style={{
              height: 52,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.06)",
              background: "linear-gradient(180deg,#0D6078,#0C4F67)",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 0.2,
              fontSize: 18,
            }}
          >
            Save
          </button>
          <button
            onClick={reset}
            style={{
              height: 52,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.06)",
              background: "linear-gradient(180deg,#274956,#203946)",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 0.2,
              fontSize: 18,
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <a
            href={`/controller?court=${encodeURIComponent(court)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 52,
              borderRadius: 14,
              background: "#2A5B6C",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 0.2,
              fontSize: 18,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            Controller
          </a>
          <a
            href={`/live?court=${encodeURIComponent(court)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 52,
              borderRadius: 14,
              background: "#6C8086",
              color: "#0b1419",
              fontWeight: 800,
              letterSpacing: 0.2,
              fontSize: 18,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            Live
          </a>
        </div>

        <div style={{ opacity: 0.6, fontSize: 12, marginTop: 16 }}>
          RTDB path: <code>{`/courts/${court}`}</code>
        </div>
      </section>
    </main>
  );
}

"use client";

export const dynamic = "force-static";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

/** Single court (fixed) */
const court = "court1";
const META_NAME_PATH = `/courts/${court}/meta/name`;

export default function IndexPage() {
  const [remoteName, setRemoteName] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Live subscribe to just the court name
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      const nameRef = ref(db, META_NAME_PATH);
      unsub = onValue(nameRef, (snap) => {
        const v = snap.val();
        const name = typeof v === "string" ? v : "";
        setRemoteName(name);
        setDraft(name);
      });
    })();
    return () => unsub?.();
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      // Write ONLY the name string for THIS court
      await set(ref(db, META_NAME_PATH), draft.trim());
    } finally {
      setSaving(false);
    }
  }

  async function onReset() {
    setResetting(true);
    try {
      // Clear ONLY the name (no scoreboard mutation)
      await set(ref(db, META_NAME_PATH), "");
      // local draft follows remote subscribe, but set immediate for snappier UI
      setDraft("");
    } finally {
      setResetting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#121a21",
        color: "#e9edf3",
        display: "grid",
        placeItems: "center",
        padding: "6vh 4vw",
      }}
    >
      <section
        style={{
          width: "min(900px,95vw)",
          background: "#0E1B24",
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 18,
          boxShadow: "0 18px 60px rgba(0,0,0,.35)",
          padding: "28px 28px 24px",
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
          {remoteName?.trim() ? remoteName : "CENTRE COURT"}
        </div>

        <hr
          style={{
            border: "none",
            height: 1,
            background: "rgba(255,255,255,.12)",
            margin: "0 0 18px",
          }}
        />

        <label style={{ display: "block", opacity: 0.8, marginBottom: 8 }}>
          Court name
        </label>

        <input
          placeholder="Centre Court"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            margin: "16px 0 12px",
          }}
        >
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              height: 52,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.06)",
              background:
                "linear-gradient(180deg,#0D6078,#0C4F67)",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 0.2,
              fontSize: 18,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>

          <button
            onClick={onReset}
            disabled={resetting}
            style={{
              height: 52,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.06)",
              background:
                "linear-gradient(180deg,#274956,#203946)",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 0.2,
              fontSize: 18,
              opacity: resetting ? 0.7 : 1,
            }}
          >
            {resetting ? "Resetting…" : "Reset"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <a
            href="/controller"
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
            href="/live"
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type BestOf = 3 | 5;

type ScoreState = {
  meta: { name: string; bestOf: BestOf; goldenPoint: boolean };
};

const COURTS = ["court1", "court2", "court3", "court4", "court5"] as const;

export default function Home() {
  const [selected, setSelected] = useState<(typeof COURTS)[number]>("court1");
  const [name, setName] = useState<string>("Centre Court");
  const [initialName, setInitialName] = useState<string>("Centre Court");
  const [ready, setReady] = useState<boolean>(false);

  // Fetch the selected court name from RTDB
  useEffect(() => {
    ensureAnonLogin?.();

    const r = ref(db, `courts/${selected}/score/meta/name`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      const next = typeof v === "string" && v.trim().length > 0 ? v : "Centre Court";
      setName(next);
      setInitialName(next);
      setReady(true);
    });
    return () => unsub();
  }, [selected]);

  const title = useMemo(
    () => (name?.trim().length ? name.trim().toUpperCase() : "CENTRE COURT"),
    [name]
  );

  const rtdbPath = useMemo(() => `/courts/${selected}`, [selected]);

  const save = async () => {
    const trimmed = name?.trim() || "Centre Court";
    await set(ref(db, `courts/${selected}/score/meta/name`), trimmed);
    setInitialName(trimmed);
  };

  const reset = async () => {
    const fallback = "Centre Court";
    setName(fallback);
    await set(ref(db, `courts/${selected}/score/meta/name`), fallback);
    setInitialName(fallback);
  };

  const dirty = name !== initialName;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: 24 }}>
      <div
        style={{
          maxWidth: 880,
          margin: "140px auto",
          background: "#0f2430",
          borderRadius: 18,
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          padding: 24,
        }}
      >
        {/* Header */}
        <h1
          style={{
            margin: 0,
            textAlign: "center",
            letterSpacing: 0.5,
            fontWeight: 800,
          }}
        >
          {title}
        </h1>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.1)",
            marginTop: 16,
            marginBottom: 18,
          }}
        />

        {/* Court dropdown */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", opacity: 0.85, marginBottom: 6 }}>Select court</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as (typeof COURTS)[number])}
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#102e3b",
              color: "#dfe6e9",
              outline: "none",
            }}
          >
            {COURTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Court name input */}
        <div style={{ marginTop: 10 }}>
          <label style={{ display: "block", opacity: 0.85, marginBottom: 6 }}>Court name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Centre Court"
            style={{
              width: "100%",
              padding: "14px 14px",
              borderRadius: 12,
              border: "none",
              background: "#172d36",
              color: "#e8f1f3",
              outline: "none",
            }}
          />
        </div>

        {/* Buttons row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 16,
          }}
        >
          <button
            onClick={save}
            disabled={!ready || !dirty}
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: dirty ? "linear-gradient(180deg,#0e6b86,#0b4f63)" : "#425b66",
              color: "#fff",
              fontWeight: 800,
              opacity: ready ? 1 : 0.7,
              cursor: ready && dirty ? "pointer" : "default",
            }}
          >
            Save
          </button>
          <button
            onClick={reset}
            disabled={!ready}
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: "#5b6d76",
              color: "#eaf0f3",
              fontWeight: 800,
              opacity: ready ? 1 : 0.7,
              cursor: ready ? "pointer" : "default",
            }}
          >
            Reset
          </button>
        </div>

        {/* Nav buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 12,
          }}
        >
          <a
            href={`/controller/?courtId=${selected}`}
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "14px 16px",
              borderRadius: 12,
              background: "#1d4f61",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Controller
          </a>
          <a
            href={`/live/?courtId=${selected}`}
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "14px 16px",
              borderRadius: 12,
              background: "#5b6d76",
              color: "#0f2430",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Live
          </a>
        </div>

        {/* RTDB path hint */}
        <div style={{ opacity: 0.6, marginTop: 14, fontSize: 12 }}>
          RTDB path: <code>{rtdbPath}</code>
        </div>
      </div>
    </div>
  );
}

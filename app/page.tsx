"use client";

import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set, update } from "firebase/database";

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

  // Read ONLY from the per-court path used by Controller/Live
  useEffect(() => {
    ensureAnonLogin?.();

    // important: unsubscribe old listener when switching courts
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

  // Write ONLY per-court keys (no cross-court bleed)
  const writeNameForCourt = async (val: string) => {
    await update(ref(db), {
      [`courts/${selected}/score/meta/name`]: val,
      [`courts/${selected}/meta/name`]: val, // optional: some variants read here
      // DO NOT write a global '/courts/name' or '/courts/score/meta/name'
    });
  };

  const save = async () => {
    const trimmed = name?.trim() || "Centre Court";
    await writeNameForCourt(trimmed);
    setInitialName(trimmed);
  };

  const reset = async () => {
    const fallback = "Centre Court";
    setName(fallback);
    await writeNameForCourt(fallback);
    setInitialName(fallback);
  };

  const dirty = name !== initialName;

  // Build links to the static alias pages (these redirect to the dynamic UI with ?courtId=)
  const controllerHref = useMemo(() => {
    const n = selected.replace("court", ""); // "court3" -> "3"
    return `/controller/court${n}/`;
  }, [selected]);

  const liveHref = useMemo(() => {
    const n = selected.replace("court", "");
    return `/live/court${n}/`;
  }, [selected]);

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
        <h1 style={{ margin: 0, textAlign: "center", letterSpacing: 0.5, fontWeight: 800 }}>
          {title}
        </h1>

        <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginTop: 16, marginBottom: 18 }} />

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

        {/* Save/Reset */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
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

        {/* Controller / Live buttons → alias routes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <a
            href={controllerHref}
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
            href={liveHref}
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

        <div style={{ opacity: 0.6, marginTop: 14, fontSize: 12 }}>
          RTDB path: <code>{rtdbPath}</code>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

const COURTS = ["court1", "court2", "court3", "court4", "court5"] as const;

export function LiveAllSelectorCard() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(["court1", "court2", "court3", "court4"]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // max 4 courts
      return [...prev, id];
    });
  };

  const canLaunch = useMemo(() => selected.length === 4, [selected]);

  return (
    <div
      style={{
        background: "var(--c-ink-2, #121B2B)",
        borderRadius: 16,
        padding: "1rem 1.2rem",
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        color: "#E9EDF3",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: "0.8rem" }}>
        Choose 4 Courts for 2×2 Live View
      </div>

      <div style={{ display: "grid", gap: "0.6rem", marginBottom: "0.8rem" }}>
        {COURTS.map((id) => (
          <label
            key={id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              background: "#2A3342",
              padding: "0.55rem 0.8rem",
              borderRadius: 10,
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={() => toggle(id)}
              style={{ accentColor: "#1ea1ff" }}
            />
            {id}
          </label>
        ))}
      </div>

      <button
        disabled={!canLaunch}
        onClick={() => router.push(`/live-all?courts=${selected.join(",")}`)}
        style={{
          width: "100%",
          background: canLaunch ? "#124E66" : "#2A3342",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "0.8rem",
          fontWeight: 800,
          cursor: canLaunch ? "pointer" : "not-allowed",
          transition: "filter 0.15s ease, transform 0.15s ease",
        }}
      >
        Open 2×2 View 🌐
      </button>

      <div style={{ marginTop: ".5rem", opacity: 0.7, fontSize: "0.85rem" }}>
        Select exactly 4 courts to enable button.
      </div>
    </div>
  );
}

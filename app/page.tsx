"use client";

import Link from "next/link";

const COURTS = ["court1", "court2", "court3", "court4", "court5"];

export default function IndexPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#121a21",
      color: "#e9edf3",
      display: "grid",
      placeItems: "center",
      padding: "6vh 4vw"
    }}>
      <section style={{
        width: "min(900px,95vw)",
        background: "#0E1B24",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: 18,
        boxShadow: "0 18px 60px rgba(0,0,0,.35)",
        padding: "28px 28px 24px"
      }}>
        <h1 style={{ textAlign: "center", fontWeight: 900, marginBottom: 20 }}>
          JoyScores — Courts
        </h1>
        <div style={{ display: "grid", gap: "18px" }}>
          {COURTS.map((c) => (
            <div key={c} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#13202A",
              borderRadius: 12,
              padding: "12px 16px"
            }}>
              <span style={{ fontSize: "1.2em", fontWeight: 600 }}>{c.toUpperCase()}</span>
              <div style={{ display: "flex", gap: "12px" }}>
                <Link href={`/controller/${c}`} style={btnStyle}>Controller</Link>
                <Link href={`/live/${c}`} style={btnStyle}>Live</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 40,
  padding: "0 18px",
  borderRadius: 10,
  background: "#2A5B6C",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
  fontSize: "0.95em",
};

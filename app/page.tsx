"use client";

import Link from "next/link";

const courts = [
  { id: "court1", label: "Court 1" },
  { id: "court2", label: "Court 2" },
  { id: "court3", label: "Court 3" },
  { id: "court4", label: "Court 4" },
  { id: "court5", label: "Court 5" },
];

export default function IndexPage() {
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
        <h1
          style={{
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: 1,
            marginBottom: 18,
            fontSize: "clamp(26px,3vw,36px)",
          }}
        >
          JoyScores — Courts
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}
        >
          {courts.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#13202A",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 20,
                  marginBottom: 4,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                }}
              >
                <Link
                  href={`/controller?court=${c.id}`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    background: "#2A5B6C",
                    borderRadius: 10,
                    padding: "12px 0",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Controller
                </Link>
                <Link
                  href={`/live?court=${c.id}`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    background: "#6C8086",
                    borderRadius: 10,
                    padding: "12px 0",
                    color: "#0b1419",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Live
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

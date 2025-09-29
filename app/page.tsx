"use client";

export default function IndexPage() {
  const courts = ["court1", "court2", "court3", "court4", "court5"];

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
          padding: 28,
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontWeight: 900,
            marginBottom: 18,
            fontSize: "clamp(26px,3vw,36px)",
          }}
        >
          JoyScores Courts
        </h1>
        <div style={{ display: "grid", gap: 16 }}>
          {courts.map((c) => (
            <div key={c} style={{ display: "flex", gap: 12 }}>
              <a
                href={`/controller?court=${c}`}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  borderRadius: 12,
                  textAlign: "center",
                  background: "#2A5B6C",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Controller {c}
              </a>
              <a
                href={`/live?court=${c}`}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  borderRadius: 12,
                  textAlign: "center",
                  background: "#6C8086",
                  color: "#0b1419",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Live {c}
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

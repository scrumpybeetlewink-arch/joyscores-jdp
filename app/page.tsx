"use client";

export default function Home() {
  const courts = ["court1","court2","court3","court4","court5"];
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: 24 }}>
      <h1 style={{ margin: 0, marginBottom: 16 }}>CENTRE COURT</h1>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16, listStyle: "none", padding: 0 }}>
        {courts.map((c) => (
          <li key={c} style={{ background: "var(--panel)", borderRadius: 16, padding: 16, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{c}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={`/controller/?courtId=${c}`} style={{ flex: 1, padding: "12px 14px", textAlign: "center", background: "var(--accent)", color: "var(--bg)", textDecoration: "none", borderRadius: 10, fontWeight: 700 }}>Controller</a>
              <a href={`/live/?courtId=${c}`} style={{ flex: 1, padding: "12px 14px", textAlign: "center", border: "1px solid var(--line)", color: "var(--text)", textDecoration: "none", borderRadius: 10, fontWeight: 700 }}>Live</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

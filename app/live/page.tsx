"use client";
export default function LiveIndex() {
  const items = ["court1","court2","court3","court4","court5"];
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Live — Select Court</h1>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 16 }}>
        {items.map((c) => (
          <li key={c} style={{ background: "var(--panel)", borderRadius: 12, padding: 16, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>{c}</div>
            <a href={`/live/${c}/`} style={{ padding: "10px 12px", background: "var(--accent)", color: "var(--bg)", borderRadius: 10, textDecoration: "none" }}>
              Open {c} Live
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

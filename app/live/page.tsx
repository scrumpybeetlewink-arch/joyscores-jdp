// app/live/page.tsx
"use client";
export default function LiveIndex() {
  const courts = ["court1","court2","court3","court4","court5"];
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: 24 }}>
      <h1 style={{ margin: 0, marginBottom: 16 }}>Live — Select Court</h1>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 16, listStyle: "none", padding: 0 }}>
        {courts.map((c) => (
          <li key={c} style={{ background: "var(--panel)", borderRadius: 12, padding: 16, border: "1px solid var(--line)" }}>
            <a href={`/live/?courtId=${c}`} style={{ padding: "10px 12px", background: "var(--accent)", color: "var(--bg)", borderRadius: 10, textDecoration: "none" }}>
              Open {c} Live
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

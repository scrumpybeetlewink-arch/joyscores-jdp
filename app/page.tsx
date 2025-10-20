"use client";
export default function Home() {
  const courts = [1,2,3,4,5];
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: 24 }}>
      <h1 style={{ margin: 0, marginBottom: 16 }}>JoyScores — Courts</h1>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16, listStyle: "none", padding: 0 }}>
        {courts.map((n) => (
          <li key={n} style={{ background: "var(--panel)", borderRadius: 12, padding: 16, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>court{n}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={`/controller-court${'${n}'}/`} style={{ padding: "8px 12px", background: "var(--accent)", color: "var(--bg)", textDecoration: "none", borderRadius: 8 }}>Controller</a>
              <a href={`/live-court${'${n}'}/`} style={{ padding: "8px 12px", border: "1px solid var(--line)", color: "var(--text)", textDecoration: "none", borderRadius: 8 }}>Live</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

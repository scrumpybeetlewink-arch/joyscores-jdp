"use client";

import Link from "next/link";

export default function IndexPage() {
  const courts = [
    { id: "court1", label: "Court 1" },
    { id: "court2", label: "Court 2" },
    { id: "court3", label: "Court 3" },
    { id: "court4", label: "Court 4" },
    { id: "court5", label: "Court 5" },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--c-ink, #0A1220)",
        color: "var(--c-cloud, #E9EDF3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
      }}
    >
      <style>{`
        .card {
          background: var(--c-ink-2, #121B2B);
          border-radius: 16px;
          padding: 2rem 2.5rem;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          width: min(420px, 90vw);
          text-align: center;
        }
        .title {
          font-size: clamp(1.6rem, 2vw + 1rem, 2.4rem);
          font-weight: 800;
          margin-bottom: 1.4rem;
          letter-spacing: -0.02em;
          color: var(--c-cloud);
        }
        .courtList {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        .courtItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--c-primary, #124E66);
          color: #fff;
          font-weight: 700;
          font-size: 1.1rem;
          border-radius: 12px;
          padding: 0.9rem 1.2rem;
          transition: background 0.15s ease, transform 0.12s ease;
          text-decoration: none;
        }
        .courtItem:hover {
          background: #186684;
          transform: translateY(-2px);
        }
        .courtItem span {
          font-weight: 500;
          opacity: 0.85;
          font-size: 0.95rem;
        }
      `}</style>

      <section className="card">
        <h1 className="title">🎾 JoyScores Controller</h1>
        <div className="courtList">
          {courts.map((c) => (
            <Link
              key={c.id}
              href={`/controller${c.id.replace("court", "")}`}
              className="courtItem"
            >
              {c.label} <span>→</span>
            </Link>
          ))}
        </div>
        <hr
          style={{
            margin: "1.8rem 0",
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.15)",
          }}
        />
        <div className="courtList">
          {courts.map((c) => (
            <Link
              key={c.id + "-live"}
              href={`/live${c.id.replace("court", "")}`}
              className="courtItem"
              style={{
                background: "#2A3342",
                color: "#E9EDF3",
              }}
            >
              {c.label} Live <span>👁️</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

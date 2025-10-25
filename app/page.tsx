"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTheme } from "./_shared/useTheme";

export default function IndexPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const courts = [
    { id: "court1", label: "Court 1" },
    { id: "court2", label: "Court 2" },
    { id: "court3", label: "Court 3" },
    { id: "court4", label: "Court 4" },
    { id: "court5", label: "Court 5" },
  ] as const;

  // default: all selected
  const [selected, setSelected] = useState<string[]>(
    courts.map((c) => c.id)
  );

  const canLaunch = useMemo(() => selected.length >= 1, [selected]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openSelected = () => {
    const q = selected.join(",");
    router.push(`/live-all?courts=${encodeURIComponent(q)}`);
  };

  // list of themes the user can pick
  const themeOptions: { id: typeof theme; label: string }[] = [
    { id: "joy-dark", label: "Joy Dark" },
    { id: "joy-light", label: "Joy Light" },
    { id: "court-blue", label: "Court Blue" },
    { id: "grass-green", label: "Grass Green" },
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
          width: min(520px, 94vw);
          text-align: center;
          border: 1px solid rgba(255,255,255,.08);
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
        .divider {
          margin: 1.8rem 0;
          border: none;
          border-top: 1px solid rgba(255,255,255,0.15);
        }
        .miniCard {
          background: #0F1624;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          padding: 1rem 1.1rem;
          text-align: left;
        }
        .checkRow {
          display: flex;
          align-items: center;
          gap: .6rem;
          background: #2A3342;
          padding: .6rem .8rem;
          border-radius: 10px;
          font-size: .95rem;
          color: #E9EDF3;
        }
        .launchBtn {
          width: 100%;
          background: #124E66;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: .85rem;
          font-weight: 800;
          margin-top: .8rem;
          cursor: pointer;
          font-size: 1rem;
        }
        .launchBtn:disabled {
          background: #2A3342;
          cursor: not-allowed;
        }
        .hint {
          margin-top: .4rem;
          opacity: .7;
          font-size: .8rem;
          text-align:center;
          line-height:1.4;
        }

        .themeBlock {
          margin-top: 1.5rem;
          background: #0F1624;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          padding: 1rem 1.1rem;
          color: var(--c-cloud);
          text-align: left;
        }
        .themeLabel {
          font-weight: 700;
          font-size: .9rem;
          margin-bottom: .6rem;
          color: var(--c-cloud);
        }
        .themeSelect {
          width: 100%;
          background: var(--c-ink-2);
          color: var(--c-cloud);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 0.7rem 0.8rem;
          font-size: .95rem;
          font-weight: 600;
        }
      `}</style>

      <section className="card">
        <h1 className="title">🎾 JoyScores Dashboard</h1>

        {/* Controllers */}
        <div className="courtList">
          {courts.map((c) => (
            <Link
              key={c.id}
              href={`/controller${c.id.replace("court", "")}`}
              className="courtItem"
            >
              {c.label} <span>⚙️</span>
            </Link>
          ))}
        </div>

        <hr className="divider" />

        {/* Live pages */}
        <div className="courtList">
          {courts.map((c) => (
            <Link
              key={c.id + "-live"}
              href={`/live${c.id.replace("court", "")}`}
              className="courtItem"
              style={{ background: "#2A3342", color: "#E9EDF3" }}
            >
              {c.label} Live <span>👁️</span>
            </Link>
          ))}
        </div>

        <hr className="divider" />

        {/* All courts combined */}
        <div className="courtList">
          <Link
            href="/live-all"
            className="courtItem"
            style={{
              background: "#394655",
              color: "#E9EDF3",
              fontSize: "1.15rem",
            }}
          >
            All Courts Live <span>🌐</span>
          </Link>

          {/* Selection mini-card */}
          <div className="miniCard" style={{ marginTop: ".9rem" }}>
            <div style={{ fontWeight: 800, marginBottom: ".6rem", color: "#fff" }}>
              Select courts for Live-All (default: all)
            </div>

            <div style={{ display: "grid", gap: ".6rem" }}>
              {courts.map((c) => (
                <label key={c.id} className="checkRow">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    style={{ accentColor: "#1EA1FF" }}
                  />
                  {c.label}
                </label>
              ))}
            </div>

            <button
              className="launchBtn"
              onClick={openSelected}
              disabled={!canLaunch}
              title={
                canLaunch
                  ? "Open Live-All with selection"
                  : "Select at least 1 court"
              }
            >
              Open Live-All with Selection
            </button>

            <div className="hint">
              This won’t change the default All Courts Live button above.
              That button still shows all 5.
            </div>
          </div>
        </div>

        {/* Theme chooser */}
        <div className="themeBlock">
          <div className="themeLabel">Theme</div>
          <select
            className="themeSelect"
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
          >
            {themeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>
    </main>
  );
}

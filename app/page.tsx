"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, set, onValue, serverTimestamp } from "firebase/database";
import Link from "next/link";

/** Paths — unified source of truth for court name (Controller also reads META_NAME_PATH) */
const COURT_PATH = "/joyscores/court1";
const META_NAME_PATH = "/joyscores/court1/meta/name";
const DEFAULT_NAME = "Centre Court";

export default function LauncherPage() {
  const [courtName, setCourtName] = useState("");

  // Load from Firebase (and localStorage as a UX hint)
  useEffect(() => {
    ensureAnonLogin().catch(() => {});
    const stored = typeof window !== "undefined" ? localStorage.getItem("courtName") : null;
    if (stored && !courtName) setCourtName(stored);

    const nameRef = ref(db, META_NAME_PATH);
    const unsub = onValue(nameRef, (snap) => {
      const v = snap.val();
      if (typeof v === "string") {
        const trimmed = v.trim();
        setCourtName(trimmed);
        if (typeof window !== "undefined") localStorage.setItem("courtName", trimmed);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveCourt() {
    const name = (courtName || "").trim() || DEFAULT_NAME;
    await set(ref(db, META_NAME_PATH), name); // source of truth
    await set(ref(db, `${COURT_PATH}/meta`), { name, updatedAt: serverTimestamp() }); // mirror
    if (typeof window !== "undefined") localStorage.setItem("courtName", name);
  }

  async function resetCourt() {
    const name = DEFAULT_NAME;
    setCourtName(name);
    await set(ref(db, META_NAME_PATH), name);
    await set(ref(db, `${COURT_PATH}/meta`), { name, updatedAt: serverTimestamp() });
    if (typeof window !== "undefined") localStorage.setItem("courtName", name);
  }

  const effectiveName = courtName || DEFAULT_NAME;
  const courtSlug = encodeURIComponent(effectiveName);
  const controllerHref = `/controller?c=${courtSlug}`;
  const liveHref = `/live?c=${courtSlug}`;

  return (
    <div className="pageWrap" style={{ background: "var(--c-ink)", minHeight: "100dvh" }}>
      {/* Theme (screenshot colors only) */}
      <style>{`
        :root{
          --c-ink:#212A31;     /* 212A31 */
          --c-ink-2:#2E3944;   /* 2E3944 */
          --c-primary:#124E66; /* 124E66 */
          --c-muted:#748D92;   /* 748D92 */
          --c-cloud:#D3D9D4;   /* D3D9D4 */
          --c-almost-black:#0B0F12; /* darker input text */
          --shadow-lg: 0 18px 60px rgba(0,0,0,.35);
          --shadow-sm: 0 6px 22px rgba(0,0,0,.25);
        }

        .pageWrap{
          background:
            radial-gradient(800px 500px at 10% -10%, rgba(18,78,102,.28), transparent 60%),
            radial-gradient(900px 600px at 110% 10%, rgba(46,57,68,.35), transparent 60%),
            var(--c-ink);
        }
        .container { margin: 0 auto; }

        .card{
          position: relative;
          background: linear-gradient(180deg, rgba(46,57,68,.95), rgba(46,57,68,.92));
          color: #fff;
          border: 1px solid rgba(211,217,212,.12);
          border-radius: 22px;
          padding: 22px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .ribbon{
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(90deg,#212A31 0%,#2E3944 25%,#124E66 50%,#748D92 75%,#D3D9D4 100%);
          opacity: .08; mix-blend-mode: screen;
        }

        .headerBar{
          display:flex; justify-content:center; align-items:center;
          padding: 6px 8px 14px;
          border-bottom: 1px solid rgba(211,217,212,0.12);
        }
        .brand{
          color: var(--c-cloud);
          font-weight: 900;
          letter-spacing: .5px;
          text-transform: uppercase;
          font-size: clamp(24px, 4vw, 36px);
        }

        .stack{ display:flex; flex-direction:column; }

        .inputWrap{ position: relative; width: 100%; }
        .input{
          width: 100%;
          background: var(--c-cloud);
          border: 2px solid transparent;
          color: var(--c-almost-black);   /* almost black text */
          caret-color: var(--c-almost-black);
          border-radius: 14px;
          height: 56px;
          padding: 0 16px;
          font-size: 18px;
          box-shadow: var(--shadow-sm);
          transition: border-color .12s ease, box-shadow .12s ease, transform .06s ease;
        }
        .input::placeholder{ color: var(--c-muted); } /* greyed-out */
        .input:focus{
          outline: none;
          border-color: var(--c-primary);
          box-shadow: 0 0 0 4px rgba(18,78,102,.25), var(--shadow-sm);
          transform: translateY(-1px);
        }

        .buttonsGrid{
          display:grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%;
        }
        @media (max-width: 560px){ .buttonsGrid{ grid-template-columns: 1fr; } }

        .btn{
          border: 0; border-radius: 16px; height: 64px; padding: 0 18px;
          font-size: 19px; font-weight: 900; letter-spacing: .2px;
          display: inline-flex; align-items: center; justify-content: center;
          text-decoration: none; cursor: pointer; width: 100%;
          transition: transform .08s ease, filter .12s ease, box-shadow .12s ease;
          box-shadow: var(--shadow-sm);
        }
        .btn:hover{ filter: brightness(1.06); transform: translateY(-2px); }
        .btn:active{ transform: translateY(0); }

        /* Palette-constrained buttons */
        .btn-primary { background: var(--c-primary); color:#fff; }
        .btn-muted   { background: var(--c-muted);  color: var(--c-ink); }
      `}</style>

      <div className="container" style={{ width: "min(920px, 92vw)", paddingTop: 28, paddingBottom: 32, display: "grid", placeItems: "center" }}>
        <div className="card" style={{ width: "min(740px, 100%)" }}>
          <div className="ribbon" />

          {/* Header: saved name, default Centre Court */}
          <div className="headerBar">
            <div className="brand" title="Court name from Firebase">
              {effectiveName}
            </div>
          </div>

          {/* Content */}
          <div className="stack" style={{ gap: 18, alignItems: "center", paddingTop: 16 }}>
            {/* Input — placeholder “Centre Court”, darker typing color */}
            <div className="inputWrap" style={{ width: "min(600px, 100%)" }}>
              <input
                id="courtNameInput"
                className="input"
                placeholder={DEFAULT_NAME}
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="buttonsGrid" style={{ width: "min(600px, 100%)" }}>
              <button className="btn btn-primary" onClick={saveCourt} aria-label="Save court name">
                Save
              </button>
              <button className="btn btn-primary" onClick={resetCourt} aria-label="Reset court name to default">
                Reset
              </button>

              <Link href={`/controller?c=${courtSlug}`} className="btn btn-muted" aria-label="Open controller">
                Controller
              </Link>
              <Link href={`/live?c=${courtSlug}`} className="btn btn-muted" aria-label="Open live view">
                Live
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

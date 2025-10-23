"use client";
export const dynamic = "force-static";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [court, setCourt] = useState<number>(1);

  const courtId = useMemo(() => `court${court}`, [court]);

  function go(where: "controller" | "live") {
    const path = where === "controller" ? `/controller${court}` : `/live${court}`;
    router.push(path);
  }

  return (
    <main className="pageWrap" style={{ background: "var(--c-ink)", minHeight: "100vh" }}>
      <style>{`
        :root{
          --c-ink:#212A31;
          --c-ink-2:#0B1B2B;   /* dark navy card */
          --c-primary:#124E66; /* buttons/select bg */
          --c-muted:#748D92;   /* neutral chips/boxes */
          --c-cloud:#D3D9D4;   /* light text */
        }
        .container { margin: 0 auto; width: min(700px, 94vw); padding: 28px 0 36px; }
        .card{
          background: var(--c-ink-2);
          color: #fff;
          border: 1px solid rgba(0,0,0,0.15);
          border-radius: 16px;
          padding: 1.2rem;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        .title{
          font-size: clamp(22px, 1.4vw + 18px, 34px);
          font-weight: 800;
          color: var(--c-cloud);
          letter-spacing: -0.01em;
          margin: 0;
        }
        .subtitle{
          margin-top: .35rem;
          opacity: .85;
          font-size: .95rem;
          color: var(--c-cloud);
        }
        .row{ display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; }

        .label{ color: var(--c-cloud); font-weight: 700; }
        .select{
          background: var(--c-cloud);
          color: #0b1419;
          border: 1px solid var(--c-muted);
          border-radius: 12px;
          height: 2.8em;
          padding: 0 .9em;
          font-size: 1rem;
          min-width: 10rem;
        }
        .btn{
          border: 1px solid transparent;
          background: var(--c-primary);
          color: #fff;
          border-radius: 12px;
          height: 3.2em;
          padding: 0 1.2em;
          font-weight: 800;
          font-size: 1rem;
          transition: transform .06s ease, filter .12s ease;
        }
        .btn:hover{ filter: brightness(1.05); transform: translateY(-1px); }
        .btn:active{ transform: translateY(0); }
        .muted{
          margin-top: .9rem;
          color: var(--c-cloud);
          opacity: .7;
          font-size: .85rem;
        }
        .grid{
          display:grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: .6rem;
        }
        @media (max-width: 560px){
          .grid{ grid-template-columns: 1fr; }
        }
        .chip{
          background: var(--c-muted);
          color: #0b1419;
          border-radius: 10px;
          padding: .55rem .7rem;
          font-weight: 800;
          text-align: center;
        }
      `}</style>

      <div className="container">
        <div className="card" style={{ display: "grid", gap: "1rem" }}>
          <div>
            <h1 className="title">JoyScores</h1>
            <div className="subtitle">Pick a court and jump right into Controller or Live.</div>
          </div>

          <div className="row" style={{ justifyContent: "space-between" }}>
            <label className="label" htmlFor="court-select">Court</label>
            <select
              id="court-select"
              className="select"
              value={court}
              onChange={(e) => setCourt(Number(e.target.value))}
            >
              <option value={1}>Court 1</option>
              <option value={2}>Court 2</option>
              <option value={3}>Court 3</option>
              <option value={4}>Court 4</option>
              <option value={5}>Court 5</option>
            </select>
          </div>

          <div className="grid">
            <button className="btn" onClick={() => go("controller")}>Open Controller</button>
            <button className="btn" onClick={() => go("live")}>Open Live</button>
          </div>

          <div className="muted">
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span>Selected:</span>
              <span className="chip">{courtId}</span>
              <span className="chip">Controller → /controller{court}</span>
              <span className="chip">Live → /live{court}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

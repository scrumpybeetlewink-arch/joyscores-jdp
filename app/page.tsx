// @ts-nocheck
"use client";
export const dynamic = "force-static";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type CourtKey = "court1" | "court2" | "court3" | "court4" | "court5";
const COURTS: CourtKey[] = ["court1", "court2", "court3", "court4", "court5"];

const DEF_NAME = (i: number) => `Court ${i + 1}`;
const PATH = (ck: CourtKey) => `/courts/${ck}/meta/name`;

export default function IndexMultiCourt() {
  const [names, setNames] = useState<Record<CourtKey, string>>({
    court1: "Centre Court",
    court2: DEF_NAME(1),
    court3: DEF_NAME(2),
    court4: DEF_NAME(3),
    court5: DEF_NAME(4),
  });

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      unsubs = COURTS.map((ck, i) =>
        onValue(ref(db, PATH(ck)), (snap) => {
          const v = snap.val();
          setNames((prev) => ({ ...prev, [ck]: typeof v === "string" ? v : (ck === "court1" ? "Centre Court" : DEF_NAME(i)) }));
        })
      );
    })();
    return () => unsubs.forEach((u) => u?.());
  }, []);

  const save = async (ck: CourtKey) => {
    await set(ref(db, PATH(ck)), names[ck] || (ck === "court1" ? "Centre Court" : DEF_NAME(COURTS.indexOf(ck))));
  };
  const reset = async (ck: CourtKey) => {
    const v = ck === "court1" ? "Centre Court" : DEF_NAME(COURTS.indexOf(ck));
    setNames((s) => ({ ...s, [ck]: v }));
    await set(ref(db, PATH(ck)), v);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#121a21", color: "#e9edf3", display: "grid", placeItems: "center", padding: "4vh 3vw" }}>
      <section style={{ width: "min(1100px,95vw)" }}>
        <h1 style={{ textAlign: "center", marginBottom: 18, fontSize: "clamp(26px,3vw,36px)", letterSpacing: 1, fontWeight: 900 }}>
          JoyScores — Courts
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 16 }}>
          {COURTS.map((ck, i) => (
            <div key={ck}
              style={{
                background: "#0E1B24",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: 16,
                boxShadow: "0 18px 60px rgba(0,0,0,.25)",
                padding: 18,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 10 }}>{ck.toUpperCase()}</div>
              <label style={{ display: "block", opacity: 0.8, marginBottom: 6 }}>Court name</label>
              <input
                value={names[ck]}
                onChange={(e) => setNames((s) => ({ ...s, [ck]: e.target.value }))}
                placeholder={ck === "court1" ? "Centre Court" : DEF_NAME(i)}
                style={{
                  width: "100%", height: 44, borderRadius: 12,
                  border: "1px solid #2a323a", background: "#13202A", color: "#E6EDF3",
                  padding: "0 12px", marginBottom: 12
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <button
                  style={{ height: 44, borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(180deg,#0D6078,#0C4F67)", color: "#fff", fontWeight: 800 }}
                  onClick={() => save(ck)}
                >Save</button>
                <button
                  style={{ height: 44, borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(180deg,#274956,#203946)", color: "#fff", fontWeight: 800 }}
                  onClick={() => reset(ck)}
                >Reset</button>
              </div>

              {/* Plain anchors with trailing / and ?c= */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <a href={`/controller/?c=${ck}`} style={btn("#2A5B6C", true)}>Controller</a>
                <a href={`/live/?c=${ck}`}       style={btn("#6C8086", false)}>Live</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function btn(bg: string, white: boolean) {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    height: 46, borderRadius: 12, background: bg, color: white ? "#fff" : "#0b1419",
    fontWeight: 800, letterSpacing: ".2px", textDecoration: "none",
    border: "1px solid rgba(255,255,255,.08)",
  } as const;
}

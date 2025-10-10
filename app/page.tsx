"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set, update } from "firebase/database";

type CourtId = "court1" | "court2" | "court3" | "court4" | "court5";

const COURTS: CourtId[] = ["court1", "court2", "court3", "court4", "court5"];

type NameMap = Record<CourtId, string>;

export default function IndexPage() {
  const [names, setNames] = useState<NameMap>({
    court1: "Centre Court",
    court2: "Court 2",
    court3: "Court 3",
    court4: "Court 4",
    court5: "Court 5",
  });
  const [loading, setLoading] = useState<Record<CourtId, boolean>>({
    court1: true, court2: true, court3: true, court4: true, court5: true,
  });

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    (async () => {
      try { await ensureAnonLogin(); } catch {}
      COURTS.forEach((cid) => {
        const nameRef = ref(db, `/courts/${cid}/meta/name`);
        const unsub = onValue(nameRef, (snap) => {
          const v = snap.val();
          setNames((prev) => ({ ...prev, [cid]: typeof v === "string" && v.trim() ? v : prev[cid] }));
          setLoading((p) => ({ ...p, [cid]: false }));
        });
        unsubs.push(unsub);
      });
    })();
    return () => { unsubs.forEach((u) => u?.()); };
  }, []);

  async function saveName(cid: CourtId, next: string) {
    const clean = next.trim();
    await set(ref(db, `/courts/${cid}/meta/name`), clean || defaultDisplayName(cid));
  }

  async function resetCourt(cid: CourtId) {
    // Reset ONLY this court; do not touch others
    const path = `/courts/${cid}`;
    await update(ref(db, path), {
      points: { p1: 0, p2: 0 },
      games: { p1: 0, p2: 0 },
      sets: { p1: [], p2: [] },
      tiebreak: false,
      tb: { p1: 0, p2: 0 },
      server: "p1",
      ts: Date.now(),
    });
  }

  return (
    <main style={{ minHeight: "100vh", background: "#121a21", color: "#e9edf3", display: "grid", placeItems: "center", padding: "6vh 4vw" }}>
      <section style={{ width: "min(1000px,95vw)", background: "#0E1B24", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, boxShadow: "0 18px 60px rgba(0,0,0,.35)", padding: 24 }}>
        <h1 style={{ textAlign: "center", fontWeight: 900, letterSpacing: 1, marginBottom: 14, fontSize: "clamp(26px,3vw,36px)" }}>COURTS</h1>
        <hr style={{ border: "none", height: 1, background: "rgba(255,255,255,.12)", margin: "0 0 18px" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {COURTS.map((cid) => (
            <CourtCard
              key={cid}
              cid={cid}
              value={names[cid]}
              loading={loading[cid]}
              onChange={(v) => setNames((p) => ({ ...p, [cid]: v }))}
              onSave={() => saveName(cid, names[cid])}
              onReset={() => resetCourt(cid)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function defaultDisplayName(cid: CourtId) {
  return cid === "court1" ? "Centre Court" : cid.replace("court", "Court ");
}

function CourtCard(props: {
  cid: CourtId;
  value: string;
  loading: boolean;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const { cid, value, loading, onChange, onSave, onReset } = props;
  const hrefCtl = `/controller?court=${cid}`;
  const hrefLive = `/live?court=${cid}`;

  return (
    <div style={{ background: "#0E1B24", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 16 }}>
      <div style={{ opacity: 0.8, marginBottom: 8 }}>Court name</div>
      <input
        placeholder={defaultDisplayName(cid)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", height: 44, borderRadius: 12, border: "1px solid #2a323a", background: "#13202A", color: "#E6EDF3", padding: "0 14px", fontSize: 16 }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 0 10px" }}>
        <button onClick={onSave} disabled={loading} style={btn("#0D6078")}>Save</button>
        <button onClick={onReset} disabled={loading} style={btn("#274956")}>Reset</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <a href={hrefCtl} style={linkBtn("#2A5B6C", true)}>Controller</a>
        <a href={hrefLive} style={linkBtn("#6C8086", false)}>Live</a>
      </div>
      <div style={{ opacity: 0.6, fontSize: 12, marginTop: 10 }}>RTDB path: <code>{`/courts/${cid}`}</code></div>
    </div>
  );
}

function btn(gradTop: string) {
  return {
    height: 48, borderRadius: 12, border: "1px solid rgba(255,255,255,.06)",
    background: `linear-gradient(180deg, ${gradTop}, ${shade(gradTop)})`,
    color: "#fff", fontWeight: 800, letterSpacing: .2, fontSize: 16
  } as const;
}
function linkBtn(bg: string, whiteText: boolean) {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    height: 48, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)",
    background: bg, color: whiteText ? "#fff" : "#0b1419",
    fontWeight: 800, letterSpacing: .2, fontSize: 16, textDecoration: "none"
  } as const;
}
function shade(hex: string) {
  // tiny darker fallback
  return "#0C4F67";
}

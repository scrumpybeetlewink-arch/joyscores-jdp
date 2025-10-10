"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, update, set } from "firebase/database";

type CourtId = "court1" | "court2" | "court3" | "court4" | "court5";
const COURTS: CourtId[] = ["court1", "court2", "court3", "court4", "court5"];

type Players = {
  "1a": { name: string; cc: string };
  "1b": { name: string; cc: string };
  "2a": { name: string; cc: string };
  "2b": { name: string; cc: string };
};

type CourtModel = {
  title: string;
  bestOf: 3 | 5;
  golden: boolean;
  serve: "p1" | "p2" | null;
  p1: { points: number; set1?: number; set2?: number; set3?: number };
  p2: { points: number; set1?: number; set2?: number; set3?: number };
  players: Players;
};

const DEFAULT_PLAYERS: Players = {
  "1a": { name: "", cc: "MY" },
  "1b": { name: "", cc: "MY" },
  "2a": { name: "", cc: "MY" },
  "2b": { name: "", cc: "MY" },
};

const EMPTY: CourtModel = {
  title: "Court 1",
  bestOf: 3,
  golden: false,
  serve: null,
  p1: { points: 0 },
  p2: { points: 0 },
  players: DEFAULT_PLAYERS,
};

function path(c: CourtId) {
  return `/courts/${c}`;
}

export default function IndexFiveCourts() {
  const [titles, setTitles] = useState<Record<CourtId, string>>({
    court1: "Court 1",
    court2: "Court 2",
    court3: "Court 3",
    court4: "Court 4",
    court5: "Court 5",
  });
  const [editing, setEditing] = useState<Record<CourtId, string>>({
    court1: "Centre Court",
    court2: "Court 2",
    court3: "Court 3",
    court4: "Court 4",
    court5: "Court 5",
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let offs: Array<() => void> = [];
    (async () => {
      await ensureAnonLogin();
      // Subscribe only to each court's title (keeps page light and avoids flicker)
      offs = COURTS.map((cid) =>
        onValue(ref(db, `${path(cid)}/title`), (snap) => {
          const t = (snap.val() as string | null) ?? defaultTitle(cid);
          setTitles((prev) => ({ ...prev, [cid]: t }));
          setEditing((prev) => ({ ...prev, [cid]: t }));
        })
      );
      setReady(true);
    })();
    return () => {
      offs.forEach((off) => off());
    };
  }, []);

  const saveTitle = (cid: CourtId) => {
    const title = (editing[cid] || "").slice(0, 30);
    return update(ref(db, path(cid)), { title });
  };

  // Reset ONLY this court (preserve its title)
  const resetCourt = (cid: CourtId) => {
    const title = (titles[cid] || defaultTitle(cid)).slice(0, 30);
    const fresh: CourtModel = {
      ...EMPTY,
      title,
    };
    return set(ref(db, path(cid)), fresh);
  };

  const defaultTitle = (cid: CourtId) =>
    cid === "court1" ? "Centre Court" : cid.replace("court", "Court ");

  if (!ready) {
    return (
      <main style={wrap}>
        <section style={card}>
          <div style={{ textAlign: "center", fontWeight: 900, letterSpacing: 1, marginBottom: 14, fontSize: 28 }}>
            Loading courts…
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <section style={{ ...card, width: "min(1100px,95vw)" }}>
        <div style={{ textAlign: "center", fontWeight: 900, letterSpacing: 1, marginBottom: 14, fontSize: 28 }}>
          COURT SELECTOR
        </div>

        <div style={grid}>
          {COURTS.map((cid) => (
            <div key={cid} style={courtCard}>
              <div style={label}>Court name</div>
              <input
                value={editing[cid]}
                onChange={(e) =>
                  setEditing((prev) => ({ ...prev, [cid]: e.target.value.slice(0, 30) }))
                }
                placeholder={defaultTitle(cid)}
                style={input}
              />

              <div style={row2}>
                <button onClick={() => saveTitle(cid)} style={btnPrimary}>
                  Save
                </button>
                <button onClick={() => resetCourt(cid)} style={btnMuted}>
                  Reset
                </button>
              </div>

              <div style={row2}>
                <a href={`/controller?court=${cid}`} style={btnLinkPrimary}>
                  Controller
                </a>
                <a href={`/live?court=${cid}`} style={btnLinkMuted}>
                  Live
                </a>
              </div>

              <div style={hint}>RTDB path: <code>{path(cid)}</code></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/* ---------- Styles (kept in the same visual language) ---------- */

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#121a21",
  color: "#e9edf3",
  display: "grid",
  placeItems: "center",
  padding: "6vh 4vw",
};

const card: React.CSSProperties = {
  width: "min(900px,95vw)",
  background: "#0E1B24",
  border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 18,
  boxShadow: "0 18px 60px rgba(0,0,0,.35)",
  padding: "28px 28px 24px",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const courtCard: React.CSSProperties = {
  background: "rgba(14,27,36,.7)",
  border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 14,
  padding: 16,
};

const label: React.CSSProperties = { display: "block", opacity: 0.8, marginBottom: 8 };

const input: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1px solid #2a323a",
  background: "#13202A",
  color: "#E6EDF3",
  padding: "0 14px",
  fontSize: 18,
};

const row2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  margin: "16px 0 12px",
};

const btnPrimary: React.CSSProperties = {
  height: 52,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.06)",
  background: "linear-gradient(180deg,#0D6078,#0C4F67)",
  color: "#fff",
  fontWeight: 800,
  letterSpacing: 0.2,
  fontSize: 18,
  cursor: "pointer",
};

const btnMuted: React.CSSProperties = {
  height: 52,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.06)",
  background: "linear-gradient(180deg,#274956,#203946)",
  color: "#fff",
  fontWeight: 800,
  letterSpacing: 0.2,
  fontSize: 18,
  cursor: "pointer",
};

const btnLinkPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 52,
  borderRadius: 14,
  background: "#2A5B6C",
  color: "#fff",
  fontWeight: 800,
  letterSpacing: 0.2,
  fontSize: 18,
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,.08)",
};

const btnLinkMuted: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 52,
  borderRadius: 14,
  background: "#6C8086",
  color: "#0b1419",
  fontWeight: 800,
  letterSpacing: 0.2,
  fontSize: 18,
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,.08)",
};

const hint: React.CSSProperties = { opacity: 0.6, fontSize: 12, marginTop: 8 };

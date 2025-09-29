"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue } from "firebase/database";

const path = "courts/court1";

export default function LivePage() {
  const [courtName, setCourtName] = useState("Court One");
  const [players, setPlayers] = useState({
    "1a": { name: "Player 1", cc: "MY" },
    "1b": { name: "Player 2", cc: "MY" },
    "2a": { name: "Player 3", cc: "MY" },
    "2b": { name: "Player 4", cc: "MY" },
  });
  const [points, setPoints] = useState({ p1: 0, p2: 0 });

  useEffect(() => {
    ensureAnonLogin();
    const courtRef = ref(db, path);
    return onValue(courtRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (data.meta?.name) setCourtName(data.meta.name);
        if (data.players) setPlayers(data.players);
        if (data.points) setPoints(data.points);
      }
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#212A31] text-white p-6 grid place-items-center">
      <div className="w-[min(1000px,95vw)] bg-[#0B1B2B] p-6 rounded-xl shadow-xl">
        <div className="text-center text-2xl font-bold text-[#D3D9D4] pb-3 border-b border-white/10">
          {courtName}
        </div>
        <div className="grid gap-4 mt-4">
          {[
            {
              id: "p1",
              team: `🇲🇾 ${players["1a"].name} / 🇲🇾 ${players["1b"].name}`,
              score: points.p1,
            },
            {
              id: "p2",
              team: `🇲🇾 ${players["2a"].name} / 🇲🇾 ${players["2b"].name}`,
              score: points.p2,
            },
          ].map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-4"
            >
              <div className="truncate font-bold text-lg">{row.team}</div>
              <div className="text-center">{row.id === "p1" ? "🎾" : ""}</div>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-400 text-black rounded-lg h-10 flex items-center justify-center font-bold">
                  {row.score}
                </div>
                <div className="bg-gray-400 text-black rounded-lg h-10"></div>
                <div className="bg-gray-400 text-black rounded-lg h-10"></div>
                <div className="bg-gray-400 text-black rounded-lg h-10">
                  {row.score}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

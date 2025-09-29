"use client";

import { useEffect, useState } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";

const path = "courts/court1";

export default function ControllerPage() {
  const [courtName, setCourtName] = useState("Court One");
  const [players, setPlayers] = useState({
    "1a": { name: "", cc: "MY" },
    "1b": { name: "", cc: "MY" },
    "2a": { name: "", cc: "MY" },
    "2b": { name: "", cc: "MY" },
  });
  const [points, setPoints] = useState<Record<Side, Point>>({ p1: 0, p2: 0 });

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

  const updateField = (field: string, value: any) =>
    set(ref(db, `${path}/${field}`), value);

  return (
    <main className="min-h-screen bg-[#212A31] text-white p-6">
      <div className="max-w-4xl mx-auto bg-[#0B1B2B] p-6 rounded-xl shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <h2 className="text-2xl font-bold">{courtName}</h2>
          <select
            value={3}
            onChange={() => {}}
            className="rounded-full bg-[#D3D9D4] text-black px-3 py-1"
          >
            <option>Best of 3</option>
            <option>Best of 5</option>
          </select>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <div className="font-bold text-lg whitespace-nowrap overflow-hidden">
            🇲🇾 {players["1a"].name || "Player 1"} / 🇲🇾{" "}
            {players["1b"].name || "Player 2"}
          </div>
          <div className="text-center">🎾</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-400 text-black rounded-lg h-10 flex items-center justify-center font-bold">
              {points.p1}
            </div>
            <div className="bg-gray-400 text-black rounded-lg h-10"></div>
            <div className="bg-gray-400 text-black rounded-lg h-10"></div>
            <div className="bg-gray-400 text-black rounded-lg h-10">
              {points.p2}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {["1a", "1b", "2a", "2b"].map((id) => (
            <div key={id} className="bg-white/10 p-4 rounded-lg space-y-2">
              <input
                placeholder={`Player ${id.toUpperCase()}`}
                value={players[id as keyof typeof players].name}
                onChange={(e) =>
                  updateField(`players/${id}/name`, e.target.value)
                }
                className="w-full h-10 rounded-lg px-2 text-black"
              />
              <select
                value={players[id as keyof typeof players].cc}
                onChange={(e) =>
                  updateField(`players/${id}/cc`, e.target.value)
                }
                className="w-full h-10 rounded-lg text-black"
              >
                <option value="MY">🇲🇾 Malaysia</option>
                <option value="US">🇺🇸 USA</option>
                <option value="GB">🇬🇧 UK</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateField(
                      "points",
                      { ...points, [id.startsWith("1") ? "p1" : "p2"]: 15 }
                    )
                  }
                  className="flex-1 h-10 bg-teal-700 rounded-lg font-bold"
                >
                  +
                </button>
                <button
                  onClick={() =>
                    updateField(
                      "points",
                      { ...points, [id.startsWith("1") ? "p1" : "p2"]: 0 }
                    )
                  }
                  className="flex-1 h-10 bg-teal-900 rounded-lg font-bold"
                >
                  −
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={() => updateField("points", { p1: 0, p2: 0 })}
            className="flex-1 h-12 rounded-lg bg-red-600 font-bold"
          >
            Reset Game
          </button>
          <button
            onClick={() =>
              updateField("players", {
                "1a": { name: "", cc: "MY" },
                "1b": { name: "", cc: "MY" },
                "2a": { name: "", cc: "MY" },
                "2b": { name: "", cc: "MY" },
              })
            }
            className="flex-1 h-12 rounded-lg bg-gray-600 font-bold"
          >
            New Match
          </button>
          <button className="flex-1 h-12 rounded-lg bg-teal-600 font-bold">
            Serve 🎾
          </button>
        </div>
      </div>
    </main>
  );
}

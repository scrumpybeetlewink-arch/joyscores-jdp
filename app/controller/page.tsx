"use client";

import { useEffect, useState, useMemo } from "react";
import { db, ensureAnonLogin } from "@/lib/firebase.client";
import { ref, onValue, set } from "firebase/database";

type Side = "p1" | "p2";
type Point = 0 | 15 | 30 | 40 | "Ad";
type BestOf = 3 | 5;

type Player = { name: string; cc: string };
type ScoreState = {
  meta: { name: string; bestOf: BestOf; golden: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  server: Side;
};

const defaultState: ScoreState = {
  meta: { name: "Joy Court 1", bestOf: 3, golden: false },
  players: {
    "1a": { name: "", cc: "MY" },
    "1b": { name: "", cc: "MY" },
    "2a": { name: "", cc: "MY" },
    "2b": { name: "", cc: "MY" },
  },
  points: { p1: 0, p2: 0 },
  games: { p1: 0, p2: 0 },
  sets: { p1: [], p2: [] },
  server: "p1",
};

export default function ControllerPage() {
  const [state, setState] = useState<ScoreState>(defaultState);

  // Firebase sync
  useEffect(() => {
    ensureAnonLogin().then(() => {
      const courtRef = ref(db, "courts/court1");
      onValue(courtRef, (snap) => {
        if (snap.exists()) {
          setState(snap.val());
        }
      });
    });
  }, []);

  const update = (s: Partial<ScoreState>) => {
    const newState = { ...state, ...s };
    setState(newState);
    set(ref(db, "courts/court1"), newState);
  };

  // --- Button Handlers ---
  const resetPoints = () => update({ points: { p1: 0, p2: 0 } });
  const resetGame = () => {
    const newGames = { ...state.games };
    newGames.p1 += 1;
    update({ games: newGames, points: { p1: 0, p2: 0 } });
  };
  const newMatch = () => update(defaultState);
  const toggleServer = () =>
    update({ server: state.server === "p1" ? "p2" : "p1" });
  const toggleGolden = () =>
    update({ meta: { ...state.meta, golden: !state.meta.golden } });

  // --- Rendering ---
  return (
    <main className="wrap">
      <section className="card">
        {/* Header */}
        <div className="head">
          <div className="title">{state.meta.name}</div>
          <div className="flex gap-2 items-center">
            <select
              className="select"
              value={state.meta.bestOf}
              onChange={(e) =>
                update({
                  meta: {
                    ...state.meta,
                    bestOf: Number(e.target.value) as BestOf,
                  },
                })
              }
            >
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
            <button
              className={`btn btn-pill ${
                state.meta.golden ? "btn-gold" : "btn-secondary"
              }`}
              onClick={toggleGolden}
            >
              ● Golden
            </button>
          </div>
        </div>

        {/* Teams + Scores */}
        <div className="row">
          <div className="teamline">
            🇲🇾 {state.players["1a"].name || "Player 1"} / 🇲🇾{" "}
            {state.players["1b"].name || "Player 2"}
          </div>
          <div className="serve">{state.server === "p1" ? "🎾" : ""}</div>
          <div className="grid">
            <div className="box">{state.games.p1}</div>
            <div className="box">{state.points.p1}</div>
            <div className="box"></div>
            <div className="box">{state.sets.p1[state.sets.p1.length - 1] || 0}</div>
          </div>
        </div>
        <div className="row">
          <div className="teamline">
            🇲🇾 {state.players["2a"].name || "Player 3"} / 🇲🇾{" "}
            {state.players["2b"].name || "Player 4"}
          </div>
          <div className="serve">{state.server === "p2" ? "🎾" : ""}</div>
          <div className="grid">
            <div className="box">{state.games.p2}</div>
            <div className="box">{state.points.p2}</div>
            <div className="box"></div>
            <div className="box">{state.sets.p2[state.sets.p2.length - 1] || 0}</div>
          </div>
        </div>

        {/* Player Inputs */}
        <div className="panelGrid">
          {(["1a", "1b", "2a", "2b"] as const).map((id, idx) => (
            <div key={id} className="panel">
              <label>Player {idx + 1}</label>
              <input
                maxLength={30}
                className="input"
                placeholder="Enter Name"
                value={state.players[id].name}
                onChange={(e) =>
                  update({
                    players: {
                      ...state.players,
                      [id]: { ...state.players[id], name: e.target.value },
                    },
                  })
                }
              />
              <select
                className="input"
                value={state.players[id].cc}
                onChange={(e) =>
                  update({
                    players: {
                      ...state.players,
                      [id]: { ...state.players[id], cc: e.target.value },
                    },
                  })
                }
              >
                <option value="MY">🇲🇾 Malaysia</option>
                <option value="US">🇺🇸 USA</option>
                <option value="GB">🇬🇧 UK</option>
              </select>
              <div className="flex gap-2 mt-2">
                <button
                  className="btn btn-primary btn-lg flex-1"
                  onClick={() =>
                    update({
                      points: {
                        ...state.points,
                        [id.startsWith("1") ? "p1" : "p2"]:
                          (state.points[id.startsWith("1") ? "p1" : "p2"] as number) + 1,
                      },
                    })
                  }
                >
                  +
                </button>
                <button
                  className="btn btn-primary btn-lg flex-1"
                  onClick={() =>
                    update({
                      points: {
                        ...state.points,
                        [id.startsWith("1") ? "p1" : "p2"]:
                          Math.max(
                            0,
                            (state.points[id.startsWith("1") ? "p1" : "p2"] as number) - 1
                          ),
                      },
                    })
                  }
                >
                  -
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-3 mt-4">
          <button className="btn btn-danger btn-lg" onClick={resetGame}>
            Reset Game
          </button>
          <button className="btn btn-secondary btn-lg" onClick={newMatch}>
            New Match
          </button>
          <button className="btn btn-primary btn-lg" onClick={toggleServer}>
            Serve 🎾
          </button>
          <button className="btn btn-danger btn-lg" onClick={resetPoints}>
            Reset Points
          </button>
        </div>
      </section>
    </main>
  );
}

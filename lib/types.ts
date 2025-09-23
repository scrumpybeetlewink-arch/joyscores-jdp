// lib/types.ts
export type Side = "p1" | "p2";
export type Point = 0 | 15 | 30 | 40 | "Ad";
export type BestOf = 3 | 5;

export type Player = { name: string; cc: string };

export type ScoreState = {
  meta: {
    name: string;
    bestOf: BestOf;
    /** When true, 40–40 = next point wins (no Advantage). */
    goldenPoint: boolean;
  };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: Record<Side, number>;
};

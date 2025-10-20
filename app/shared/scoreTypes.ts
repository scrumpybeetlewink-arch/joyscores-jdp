export type Side = "p1" | "p2";
export type Point = 0 | 15 | 30 | 40 | "Ad";
export type BestOf = 3 | 5;
export type Player = { name: string; cc: string };

export type ScoreState = {
  meta: { name: string; bestOf: BestOf; goldenPoint: boolean };
  players: { "1a": Player; "1b": Player; "2a": Player; "2b": Player };
  points: Record<Side, Point>;
  games: Record<Side, number>;
  sets: { p1: number[]; p2: number[] };
  server: Side;
  last?: { t: string; [k: string]: any } | undefined;
};

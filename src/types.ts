export interface Court {
  id: number;
  name: string;
  scoreHome: number;
  scoreAway: number;
  updatedAt: string; // ISO timestamp
}

export interface CourtsState {
  courts: Court[];
}
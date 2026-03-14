export type Point = 0 | 15 | 30 | 40 | 'AD';

export interface MatchState {
  teamA: {
    points: Point | number;
    games: number;
    sets: number;
  };
  teamB: {
    points: Point | number;
    games: number;
    sets: number;
  };
  completedSets: { teamA: number, teamB: number }[];
  isTiebreak: boolean;
  matchWinner: 'A' | 'B' | null;
}

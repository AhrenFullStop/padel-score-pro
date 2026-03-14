import { useState, useCallback } from 'react';
import { MatchState, Point } from '../types';

const initialState: MatchState = {
  teamA: { points: 0, games: 0, sets: 0 },
  teamB: { points: 0, games: 0, sets: 0 },
  completedSets: [],
  isTiebreak: false,
  matchWinner: null,
};

interface State {
  history: MatchState[];
  currentIndex: number;
}

export function useMatchState() {
  const [state, setState] = useState<State>({
    history: [initialState],
    currentIndex: 0,
  });

  const addPoint = useCallback((winner: 'A' | 'B') => {
    setState((prev) => {
      const curr = prev.history[prev.currentIndex];
      if (curr.matchWinner) return prev;

      const nextState = JSON.parse(JSON.stringify(curr)) as MatchState;
      const loser = winner === 'A' ? 'B' : 'A';
      const wKey = winner === 'A' ? 'teamA' : 'teamB';
      const lKey = loser === 'A' ? 'teamA' : 'teamB';

      if (nextState.isTiebreak) {
        nextState[wKey].points = (nextState[wKey].points as number) + 1;
        const wPoints = nextState[wKey].points as number;
        const lPoints = nextState[lKey].points as number;
        
        if (wPoints >= 7 && wPoints - lPoints >= 2) {
          winGame(winner, nextState);
        }
      } else {
        const wPoints = nextState[wKey].points as Point;
        const lPoints = nextState[lKey].points as Point;

        if (wPoints === 0) nextState[wKey].points = 15;
        else if (wPoints === 15) nextState[wKey].points = 30;
        else if (wPoints === 30) nextState[wKey].points = 40;
        else if (wPoints === 40) {
          if (lPoints === 40) {
            nextState[wKey].points = 'AD';
          } else if (lPoints === 'AD') {
            nextState[lKey].points = 40;
          } else {
            winGame(winner, nextState);
          }
        } else if (wPoints === 'AD') {
          winGame(winner, nextState);
        }
      }

      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
      return {
        history: [...newHistory, nextState],
        currentIndex: prev.currentIndex + 1,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.max(0, prev.currentIndex - 1),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      history: [initialState],
      currentIndex: 0,
    });
  }, []);

  const currentState = state.history[state.currentIndex];
  const previousState = state.currentIndex > 0 ? state.history[state.currentIndex - 1] : null;

  return { state: currentState, addPoint, undo, reset, previousState };
}

function winGame(winner: 'A' | 'B', state: MatchState) {
  const wKey = winner === 'A' ? 'teamA' : 'teamB';
  const lKey = winner === 'A' ? 'teamB' : 'teamA';

  state[wKey].games++;
  state.teamA.points = 0;
  state.teamB.points = 0;
  
  const wGames = state[wKey].games;
  const lGames = state[lKey].games;

  if (wGames === 6 && lGames === 6) {
    state.isTiebreak = true;
    state.teamA.points = 0;
    state.teamB.points = 0;
  } else if ((wGames === 6 && lGames <= 4) || wGames === 7) {
    // Win set
    state.completedSets.push({ teamA: state.teamA.games, teamB: state.teamB.games });
    state[wKey].sets++;
    
    state.teamA.games = 0;
    state.teamB.games = 0;
    state.isTiebreak = false;
    
    if (state[wKey].sets === 2) {
      state.matchWinner = winner;
    }
  }
}

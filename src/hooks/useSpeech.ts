import { useCallback, useEffect, useState, useRef } from 'react';
import { MatchState, Point } from '../types';

export function useSpeech() {
  const [enabled, setEnabled] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        if (synthRef.current) {
          setVoices(synthRef.current.getVoices());
        }
      };
      loadVoices();
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = loadVoices;
      }
      return () => {
        if (synthRef.current) {
          synthRef.current.onvoiceschanged = null;
        }
      };
    }
  }, []);

  const announce = useCallback((state: MatchState, previousState: MatchState | null) => {
    if (!enabled || !synthRef.current) return;
    
    synthRef.current.cancel();

    const text = getAnnouncement(state, previousState);
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Prefer Google UK English Female or similar clear voice
    const preferredVoice = voices.find(v => v.name.includes('Google UK English Female')) ||
                           voices.find(v => v.name.includes('Google US English')) ||
                           voices.find(v => v.lang.startsWith('en-'));
                           
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.rate = 1.0;
    synthRef.current.speak(utterance);
  }, [enabled, voices]);

  const toggleSpeech = () => setEnabled(!enabled);

  return { enabled, toggleSpeech, announce };
}

function getAnnouncement(state: MatchState, previousState: MatchState | null): string {
  if (state.matchWinner) {
    return `Game, set, match, Team ${state.matchWinner}`;
  }
  
  if (state.teamA.points === 0 && state.teamB.points === 0) {
    if (previousState && previousState.teamA.games !== state.teamA.games) {
      return `Game Team A. ${state.teamA.games} games to ${state.teamB.games}`;
    }
    if (previousState && previousState.teamB.games !== state.teamB.games) {
      return `Game Team B. ${state.teamB.games} games to ${state.teamA.games}`;
    }
  }

  if (state.isTiebreak) {
    return `${state.teamA.points} ${state.teamB.points}`;
  }

  const pA = state.teamA.points;
  const pB = state.teamB.points;

  if (pA === 'AD') return "Advantage Team A";
  if (pB === 'AD') return "Advantage Team B";
  if (pA === 40 && pB === 40) return "Deuce";
  
  const speakPoint = (p: Point | number) => p === 0 ? "Love" : p.toString();
  
  if (pA === pB) {
    return `${speakPoint(pA)} all`;
  }
  
  return `${speakPoint(pA)} ${speakPoint(pB)}`;
}


import React, { useState, useEffect, useRef } from 'react';
import { useMatchState } from './hooks/useMatchState';
import { useSpeech } from './hooks/useSpeech';
import { useWakeLock } from './hooks/useWakeLock';
import { useKeyControls } from './hooks/useKeyControls';
import { Volume2, VolumeX, RotateCcw, Info, Play } from 'lucide-react';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const { state, addPoint, undo, reset, previousState } = useMatchState();
  const { enabled: speechEnabled, toggleSpeech, announce } = useSpeech();
  const { request: requestWakeLock } = useWakeLock();
  const [showInfo, setShowInfo] = useState(false);

  // Announce score when state changes
  useEffect(() => {
    if (hasStarted && state !== previousState) {
      announce(state, previousState);
    }
  }, [state, previousState, hasStarted, announce]);

  useKeyControls(
    () => addPoint('A'),
    () => addPoint('B'),
    () => undo()
  );

  const handleStart = () => {
    setHasStarted(true);
    requestWakeLock();
    // Initialize speech synthesis on first interaction
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Match started");
      utterance.volume = 0; // silent
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6">
        <h1 className="text-5xl font-bold mb-8 text-emerald-400">Padel Tracker</h1>
        <p className="text-zinc-400 text-center max-w-md mb-8">
          A hands-free score tracker. Tap the sides to score, long press to undo. 
          Keeps your screen awake and announces the score.
        </p>
        <button 
          onClick={handleStart}
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-4 px-12 rounded-full text-xl transition-transform active:scale-95 flex items-center gap-3"
        >
          <Play fill="currentColor" /> Start Match
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden select-none">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
        <button 
          onClick={() => setShowInfo(true)}
          className="p-3 bg-zinc-900/50 backdrop-blur rounded-full pointer-events-auto active:scale-95"
        >
          <Info size={24} />
        </button>
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={undo}
            className="p-3 bg-zinc-900/50 backdrop-blur rounded-full active:scale-95"
          >
            <RotateCcw size={24} />
          </button>
          <button 
            onClick={toggleSpeech}
            className="p-3 bg-zinc-900/50 backdrop-blur rounded-full active:scale-95"
          >
            {speechEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>
      </div>

      {/* Score Board */}
      <div className="flex flex-col landscape:flex-row flex-1">
        <ScoreArea 
          team="A" 
          name="Team A"
          color="bg-indigo-600" 
          activeColor="bg-indigo-500"
          state={state} 
          onScore={() => addPoint('A')} 
          onUndo={undo} 
        />
        <ScoreArea 
          team="B" 
          name="Team B"
          color="bg-emerald-600" 
          activeColor="bg-emerald-500"
          state={state} 
          onScore={() => addPoint('B')} 
          onUndo={undo} 
        />
      </div>

      {/* Match Winner Overlay */}
      {state.matchWinner && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
          <h2 className="text-6xl font-bold mb-4">
            Team {state.matchWinner} Wins!
          </h2>
          <div className="text-2xl text-zinc-300 mb-8">
            {state.completedSets.map((set, i) => (
              <span key={i} className="mx-2">
                {set.teamA} - {set.teamB}
              </span>
            ))}
          </div>
          <button 
            onClick={reset}
            className="bg-white text-black font-bold py-3 px-8 rounded-full text-xl"
          >
            New Match
          </button>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30 p-6">
          <div className="bg-zinc-900 p-8 rounded-3xl max-w-md w-full relative">
            <h3 className="text-2xl font-bold mb-4">How to use</h3>
            <ul className="space-y-4 text-zinc-300 mb-8">
              <li><strong className="text-white">Tap</strong> a side to add a point.</li>
              <li><strong className="text-white">Long press</strong> a side to undo.</li>
              <li>
                <strong className="text-white">Volume Buttons / Remote:</strong>
                <p className="text-sm mt-1 text-zinc-400">
                  Web apps cannot reliably detect volume buttons when the screen is locked. 
                  For pocket use, we recommend a cheap Bluetooth media remote:
                </p>
                <ul className="list-disc pl-5 mt-2 text-sm text-zinc-400 space-y-1">
                  <li>Single press (Up/Next): Team A point</li>
                  <li>Double press (Up/Next): Team B point</li>
                  <li>Hold (Up/Next): Undo</li>
                </ul>
              </li>
            </ul>
            <button 
              onClick={() => setShowInfo(false)}
              className="w-full bg-emerald-500 text-zinc-950 font-bold py-3 rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ScoreAreaProps {
  team: 'A' | 'B';
  name: string;
  color: string;
  activeColor: string;
  state: any;
  onScore: () => void;
  onUndo: () => void;
}

function ScoreArea({ team, name, color, activeColor, state, onScore, onUndo }: ScoreAreaProps) {
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore multi-touch or right clicks
    if (!e.isPrimary) return;
    
    setIsActive(true);
    isLongPress.current = false;
    
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onUndo();
      // Provide haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    setIsActive(false);
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isLongPress.current) {
      onScore();
    }
  };

  const handlePointerCancel = () => {
    setIsActive(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const teamKey = team === 'A' ? 'teamA' : 'teamB';
  const points = state[teamKey]?.points ?? 0;
  const games = state[teamKey]?.games ?? 0;
  const sets = state[teamKey]?.sets ?? 0;

  return (
    <div 
      className={`flex-1 flex flex-col items-center justify-center relative transition-colors duration-150 ${isActive ? activeColor : color}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
      style={{ touchAction: 'none' }} // Prevent scrolling/zooming
    >
      <div className="absolute top-8 landscape:top-12 md:top-20 opacity-50 text-xl font-medium tracking-widest uppercase">
        {name}
      </div>
      
      <div className="text-[10rem] landscape:text-[12rem] md:text-[16rem] font-bold leading-none tracking-tighter">
        {points}
      </div>

      <div className="absolute bottom-6 landscape:bottom-8 md:bottom-12 flex gap-8 text-2xl landscape:text-3xl font-medium opacity-80">
        <div className="flex flex-col items-center">
          <span className="text-sm uppercase tracking-widest opacity-60 mb-1">Sets</span>
          <span>{sets}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm uppercase tracking-widest opacity-60 mb-1">Games</span>
          <span>{games}</span>
        </div>
      </div>
    </div>
  );
}

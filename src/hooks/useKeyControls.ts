import { useEffect, useRef } from 'react';

export function useKeyControls(
  onSinglePress: () => void,
  onDoublePress: () => void,
  onHold: () => void
) {
  const pressCount = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHolding = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Ignore auto-repeat

      if (['AudioVolumeUp', 'ArrowUp', 'MediaNextTrack'].includes(e.key)) {
        isHolding.current = false;
        
        // Start hold timer
        holdTimerRef.current = setTimeout(() => {
          isHolding.current = true;
          onHold();
        }, 600);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['AudioVolumeUp', 'ArrowUp', 'MediaNextTrack'].includes(e.key)) {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
        }

        if (isHolding.current) {
          // It was a hold, do nothing on release
          isHolding.current = false;
          return;
        }

        // It was a short press
        pressCount.current += 1;

        if (pressCount.current === 1) {
          timerRef.current = setTimeout(() => {
            if (pressCount.current === 1) {
              onSinglePress();
            } else if (pressCount.current >= 2) {
              onDoublePress();
            }
            pressCount.current = 0;
          }, 300); // 300ms window for double press
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [onSinglePress, onDoublePress, onHold]);
}

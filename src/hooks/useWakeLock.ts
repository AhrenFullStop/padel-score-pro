import { useState, useEffect, useCallback } from 'react';

export function useWakeLock() {
  const [isSupported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  const [isActive, setIsActive] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    if (!isSupported) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        setIsActive(false);
        setWakeLock(null);
      });
      setWakeLock(sentinel);
      setIsActive(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.warn('Wake Lock not allowed in this context.');
      } else {
        console.error('Wake Lock error:', err);
      }
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setIsActive(false);
    }
  }, [wakeLock]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        request();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [wakeLock, request]);

  return { isSupported, isActive, request, release };
}


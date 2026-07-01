import { useState, useEffect } from 'react';
import { getAwakeMs } from '../lib/stats';
import type { AppData } from '../types';

export function useLiveTimer(active: boolean, startIso: string | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || !startIso) {
      setElapsed(0);
      return;
    }
    const start = new Date(startIso).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startIso]);

  return elapsed;
}

export function useAwakeTimer(data: AppData) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(getAwakeMs(data));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data]);

  return elapsed;
}

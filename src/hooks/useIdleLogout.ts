import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_IDLE_TIMEOUT = 15 * 60 * 1000;

export function useIdleLogout(enabled: boolean, timeoutMs = DEFAULT_IDLE_TIMEOUT) {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, markActive));

    const interval = window.setInterval(async () => {
      if (Date.now() - lastActivityRef.current > timeoutMs) {
        await supabase.auth.signOut();
      }
    }, 30_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, markActive));
      window.clearInterval(interval);
    };
  }, [enabled, timeoutMs]);
}

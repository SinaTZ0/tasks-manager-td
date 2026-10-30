import { useSyncExternalStore } from "react";

/*===== Now =====*/
// One shared clock for everything that shows live time (running timers on cards, the drawer, the header), ticking once
// a second while anything listens.

const listeners = new Set<() => void>();
let now = Date.now();
let ticker: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!ticker) {
    now = Date.now();
    ticker = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(ticker);
      ticker = undefined;
    }
  };
}

/**
 * The current time in milliseconds, updated every second. It is `null` on the server and while the page hydrates: the
 * server's clock and the browser's never agree to the second, so live time is only drawn once the page runs.
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
}

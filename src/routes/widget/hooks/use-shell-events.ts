import { useEffect, useEffectEvent } from "react";

import { type ShellEvent, tellShell } from "../bridge";

/*===== Shell Events =====*/

/** Hears what the shell tells the page, and says the page is ready to hear it. */
export function useShellEvents(onEvent: (event: ShellEvent) => void): void {
  const handle = useEffectEvent(onEvent);

  useEffect(() => {
    const hear = (event: Event) => handle((event as CustomEvent<ShellEvent>).detail);
    window.addEventListener("tofang:shell", hear);
    tellShell({ type: "ready" });
    return () => window.removeEventListener("tofang:shell", hear);
  }, []);
}

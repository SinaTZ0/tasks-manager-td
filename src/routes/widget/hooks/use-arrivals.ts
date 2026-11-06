import { useEffect, useEffectEvent, useRef } from "react";

import type { Notification } from "#/orpc/notification/contract";

/*===== Arrivals =====*/

/**
 * Calls `onArrive` with notifications that weren't in the list before. The live stream only says "something new", so
 * the list is compared with the last one. What the first load finds is old news, not an arrival.
 */
export function useArrivals({
  items,
  onArrive,
}: {
  items: Notification[];
  onArrive: (fresh: Notification[]) => void;
}): void {
  const seen = useRef<Set<string> | null>(null);
  const arrive = useEffectEvent(onArrive);

  useEffect(() => {
    const known = seen.current;
    seen.current = new Set([...(known ?? []), ...items.map((item) => item.id)]);
    if (!known) return;
    const fresh = items.filter((item) => !item.read && !known.has(item.id));
    if (fresh.length > 0) arrive(fresh);
  }, [items]);
}

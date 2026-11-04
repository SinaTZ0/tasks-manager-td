import type { ReactNode } from "react";

import { Marking } from "#/components/primitive/marking/marking";

/*===== Panel Group =====*/

/**
 * Keys that belong together on a panel, under one printed name with a rule running from it across the group,
 * the way a sampler prints "BPM ——— METRONOME" over the keys it covers. The name is print only (hidden from screen
 * readers): each key inside carries its own name, and a filter row its own `fieldset`.
 */
export function PanelGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span aria-hidden="true" className="flex items-center gap-2">
        <Marking>{label}</Marking>
        <span className="h-px flex-1 bg-border" />
      </span>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

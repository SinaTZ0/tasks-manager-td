import type { ReactNode } from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';

import { cn } from '@/shared/lib/utils';
import { codeMarkingClassName, keycapVariants, slotClassName } from './instrument.recipes';
import { Led } from './led';

/*===== Types =====*/

type KeyTab = {
  value: string;
  label: string;
  /** Count printed on the key, e.g. number of comments. */
  count?: number;
  content: ReactNode;
};

/*===== Key Tabs =====*/

/**
 * Tabs drawn as latching keys in one slot; the active tab stays sunk with its LED lit. Panels sit
 * directly under the slot with no card around them, so the keys read as the panel's mode selector.
 * Built on Base UI Tabs, so arrow keys, roving focus, and ARIA tab roles are handled.
 *
 * @param props - Accessible name, tab definitions, and the initially selected value.
 * @returns A Base UI tabs root with keyed tab list and panels.
 */
export function KeyTabs({
  tabs,
  defaultValue,
  'aria-label': ariaLabel,
}: {
  tabs: readonly KeyTab[];
  defaultValue: string;
  'aria-label': string;
}) {
  return (
    <BaseTabs.Root defaultValue={defaultValue} className="flex flex-col gap-5">
      <BaseTabs.List aria-label={ariaLabel} className={cn(slotClassName, 'w-full')}>
        {tabs.map((tab) => (
          <BaseTabs.Tab
            key={tab.value}
            value={tab.value}
            // The slot supplies the void; Base UI marks the selected tab with data-active, which the recipe sinks
            className={cn(keycapVariants({ tone: 'secondary', size: 'compact' }), 'group/tab flex-1 before:hidden')}
          >
            <Led className="group-data-active/tab:hidden" signal="selection" state="off" />
            <Led className="hidden group-data-active/tab:inline-block" signal="selection" state="on" />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(codeMarkingClassName, 'text-current opacity-60')}>
                <bdi dir="ltr">{String(tab.count).padStart(2, '0')}</bdi>
              </span>
            )}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>

      {tabs.map((tab) => (
        <BaseTabs.Panel key={tab.value} value={tab.value} className="outline-none">
          {tab.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}

import { useEffect, useLayoutEffect, useRef } from "react";

/*===== Shortcuts =====*/
// Single-key shortcuts (docs/task-manager-plan.md → slice 18). Keys are matched by `event.code`, the key's place on
// the keyboard, so `n` is the same key on a Persian layout (where it types «د»). One document listener serves every
// component that registers keys, so a two-key sequence (`g` then `m`) is never also read as `m` alone.

export type Shortcut = {
  /** The key's `KeyboardEvent.code`: `KeyN`, `Slash`. */
  code: string;
  /** Held with Shift (`?` is Shift and the slash key). */
  shift?: boolean;
  /** The key pressed just before it, for a sequence: `KeyG` for `g` then `b`. */
  after?: string;
  run: () => void;
};

/** How long after the first key of a sequence the second one still counts, in milliseconds. */
const SEQUENCE_MS = 1500;

const registered = new Set<{ current: Shortcut[] }>();
let pending: { code: string; at: number } | null = null;

/**
 * Whether a key press may be a shortcut: not while typing (a field, an editor), and not inside a menu, a list box or a
 * dialog, whose keys are their own. The task drawer is the exception: its shortcuts act on the card it shows.
 */
function acceptsShortcuts(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return false;
  if (target.closest("input, textarea, select, [role=menu], [role=listbox], [role=combobox]")) return false;
  const dialog = target.closest("[role=dialog], [role=alertdialog]");
  return !dialog || dialog.matches("[data-slot=sheet-content]");
}

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.repeat || event.isComposing) return;
  if (event.ctrlKey || event.metaKey || event.altKey || !acceptsShortcuts(event.target)) {
    pending = null;
    return;
  }
  const shortcuts = [...registered].flatMap((entry) => entry.current);
  const after = pending && Date.now() - pending.at < SEQUENCE_MS ? pending.code : undefined;
  pending = null;

  const match = shortcuts.find(
    (shortcut) => shortcut.code === event.code && !!shortcut.shift === event.shiftKey && shortcut.after === after,
  );
  if (match) {
    event.preventDefault();
    match.run();
    return;
  }
  if (!after && !event.shiftKey && shortcuts.some((shortcut) => shortcut.after === event.code)) {
    pending = { code: event.code, at: Date.now() };
  }
}

/**
 * Registers keyboard shortcuts while the component is mounted. The list may change on every render (its `run`s
 * usually close over state); the latest is the one used.
 */
export function useShortcuts(shortcuts: Shortcut[]): void {
  const latest = useRef(shortcuts);
  useLayoutEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    const entry = latest;
    if (registered.size === 0) document.addEventListener("keydown", onKeyDown);
    registered.add(entry);
    return () => {
      registered.delete(entry);
      if (registered.size === 0) document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}

import { flushSync } from "react-dom";

/*===== Board Panel =====*/
// Whether each person keeps a board's head panel (the project's name, display and keys) open or folded away, saved in
// their browser like the board layout (`src/lib/board-layout.ts`) and the same on every project. A folded panel leaves
// the columns the whole window below the header.
// The choice lives on <html> as `data-board-panel="closed"`, and the panel hides through the `board-panel-closed`
// variant (src/styles.css). `BOARD_PANEL_INIT_SCRIPT`, inlined into the server-rendered <head>, applies it before
// anything paints, so a folded panel never flashes open.
// Folding animates as a view transition of type `board-panel`: the panel folds up into the header and the columns
// slide up to take its place (src/styles.css → Board Panel). The state is the attribute on <html>, not React's, so this
// starts the browser's transition itself; where there is none, or it won't take a type, the panel just folds.

const STORAGE_KEY = "app-board-panel";
// Notifies other components in this tab; the `storage` event only fires in other tabs.
const CHANGE_EVENT = "app:board-panel-change";
const CLOSED = "closed";
const TRANSITION_TYPE = "board-panel";

/*===== First Paint =====*/
/** Runs before the page paints, so a folded panel stays folded on load. Mirrors `apply`. */
export const BOARD_PANEL_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})===${JSON.stringify(CLOSED)})document.documentElement.dataset.boardPanel=${JSON.stringify(CLOSED)}}catch(e){}})()`;

function apply(closed: boolean) {
  const root = document.documentElement;
  if (closed) root.dataset.boardPanel = CLOSED;
  else delete root.dataset.boardPanel;
}

/*===== Store =====*/
// Shaped for `useSyncExternalStore`.

/** Whether the panel is folded on this page. */
export const getBoardPanelClosed = () => document.documentElement.dataset.boardPanel === CLOSED;

/** What the server renders: it can't know the choice, so the key shows the panel open until hydration. */
export const getBoardPanelClosedOnServer = () => false;

/** Folds or opens the panel, animated where the browser can, and saves the choice. */
export function setBoardPanelClosed(closed: boolean) {
  try {
    if (closed) localStorage.setItem(STORAGE_KEY, CLOSED);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not saved, but still applied for this page view.
  }
  const update = () => {
    apply(closed);
    // The key's latched face is React's: render it now, so the new snapshot already shows it pressed or released.
    flushSync(() => window.dispatchEvent(new Event(CHANGE_EVENT)));
  };
  try {
    // Browsers from before transition types take only a callback and throw on the options object.
    document.startViewTransition({ update, types: [TRANSITION_TYPE] });
  } catch {
    update();
  }
}

/** Subscribes to the choice changing, here and in other tabs. */
export function subscribeToBoardPanel(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    apply(event.newValue === CLOSED);
    onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

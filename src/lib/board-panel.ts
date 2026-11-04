/*===== Board Panel =====*/
// Whether each person keeps a board's sidebar (the project's name, display and keys) open or shrunk to a strip of
// icons, saved in their browser like the board layout (`src/lib/board-layout.ts`) and the same on every project. The
// strip leaves the columns nearly the whole width of the window.
// `BoardPanelProvider` hands this store to the `SidebarProvider`, which shrinks the `Sidebar` (primitive/sidebar/). The
// choice also lives on <html> as `data-board-panel="closed"`: `BOARD_PANEL_INIT_SCRIPT`, inlined into the
// server-rendered <head>, applies it before anything paints, and the `sidebar-icon` variant (src/styles.css) reads it,
// so a shrunk sidebar never flashes open while the server's HTML waits for React.

const STORAGE_KEY = "app-board-panel";
// Notifies other components in this tab; the `storage` event only fires in other tabs.
const CHANGE_EVENT = "app:board-panel-change";
const CLOSED = "closed";

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

/** Folds or opens the panel and saves the choice. */
export function setBoardPanelClosed(closed: boolean) {
  try {
    if (closed) localStorage.setItem(STORAGE_KEY, CLOSED);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not saved, but still applied for this page view.
  }
  apply(closed);
  window.dispatchEvent(new Event(CHANGE_EVENT));
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

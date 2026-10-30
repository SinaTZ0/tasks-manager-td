/*===== Board Layout =====*/
// How each person likes a board's columns laid out, saved in their browser like the theme (`src/lib/theme.ts`):
//   scroll  one row as wide as the columns need; the row scrolls (the default)
//   fit     one row squeezed to the window's width, no scrolling
//   wrap    several rows, `perRow` columns in each
// The choice lives on <html> as `data-board-layout` and `--board-per-row`, and the board's classes read it through the
// `board-fit` and `board-wrap` variants (src/styles.css). The server can't read the browser's storage, so
// `BOARD_LAYOUT_INIT_SCRIPT`, inlined into the server-rendered <head>, applies it before anything paints.

export const BOARD_LAYOUT_MODES = ["scroll", "fit", "wrap"] as const;
export type BoardLayoutMode = (typeof BOARD_LAYOUT_MODES)[number];

export const BOARD_PER_ROW = [2, 3, 4] as const;
export type BoardPerRow = (typeof BOARD_PER_ROW)[number];

export type BoardLayout = { mode: BoardLayoutMode; perRow: BoardPerRow };

const STORAGE_KEY = "app-board-layout";
// Notifies other components in this tab; the `storage` event only fires in other tabs.
const CHANGE_EVENT = "app:board-layout-change";
// Stored as one word: `scroll`, `fit`, or `wrap-3`.
const PATTERN = /^(scroll|fit|wrap)(?:-([234]))?$/;
const DEFAULT_LAYOUT = "scroll";

/*===== First Paint =====*/
/** Runs before the page paints, so the board never jumps from the default layout to the saved one. Mirrors `apply`. */
export const BOARD_LAYOUT_INIT_SCRIPT = `(function(){try{var m=${PATTERN.toString()}.exec(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"");if(!m)return;var r=document.documentElement;r.dataset.boardLayout=m[1];if(m[2])r.style.setProperty("--board-per-row",m[2])}catch(e){}})()`;

/*===== Helpers =====*/
/** Reads a stored word back; anything unknown is the default. */
export function parseBoardLayout(value: string | null | undefined): BoardLayout {
  const match = PATTERN.exec(value ?? "");
  return {
    mode: (match?.[1] as BoardLayoutMode | undefined) ?? "scroll",
    perRow: match?.[2] ? (Number(match[2]) as BoardPerRow) : 3,
  };
}

const serialize = ({ mode, perRow }: BoardLayout) => (mode === "wrap" ? `wrap-${perRow}` : mode);

function apply({ mode, perRow }: BoardLayout) {
  const root = document.documentElement;
  root.dataset.boardLayout = mode;
  root.style.setProperty("--board-per-row", String(perRow));
}

/*===== Store =====*/
// Shaped for `useSyncExternalStore`: the snapshot is the stored word, a string, so it compares by value.

/** The layout applied to the document, as its stored word. */
export function getBoardLayoutSnapshot(): string {
  const root = document.documentElement;
  return serialize({
    mode: (root.dataset.boardLayout as BoardLayoutMode | undefined) ?? "scroll",
    perRow: parseBoardLayout(`wrap-${root.style.getPropertyValue("--board-per-row")}`).perRow,
  });
}

/** What the server renders: it can't know the saved layout, so controls show the default until hydration. */
export const getBoardLayoutServerSnapshot = () => DEFAULT_LAYOUT;

/** Applies and saves a layout. */
export function setBoardLayout(layout: BoardLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(layout));
  } catch {
    // Not saved, but still applied for this page view.
  }
  apply(layout);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscribes to layout changes, here and in other tabs. */
export function subscribeToBoardLayout(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    apply(parseBoardLayout(event.newValue));
    onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

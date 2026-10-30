import { PanelTopCloseIcon, PanelTopOpenIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "#/components/primitive/button/button";
import {
  getBoardPanelClosed,
  getBoardPanelClosedOnServer,
  setBoardPanelClosed,
  subscribeToBoardPanel,
} from "#/lib/board-panel";
import { m } from "#/paraglide/messages";

/*===== Board Panel Toggle =====*/

/** The id of the board's head panel, which the key controls. */
export const BOARD_PANEL_ID = "board-panel";

/**
 * The header key that folds a board's head panel away and brings it back (`src/lib/board-panel.ts`): a latch, sunk
 * while the panel is folded, like the dark-mode key beside it. The icon is chosen with CSS (`board-panel-closed:`),
 * so it is right on the server-rendered page too. The site layout shows it only on a board.
 */
export function BoardPanelToggle() {
  const closed = useSyncExternalStore(subscribeToBoardPanel, getBoardPanelClosed, getBoardPanelClosedOnServer);

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      aria-label={m.board_panel_hide()}
      title={m.board_panel_hide()}
      aria-pressed={closed}
      aria-controls={BOARD_PANEL_ID}
      onClick={() => setBoardPanelClosed(!closed)}
    >
      <PanelTopCloseIcon className="board-panel-closed:hidden" />
      <PanelTopOpenIcon className="hidden board-panel-closed:block" />
    </Button>
  );
}

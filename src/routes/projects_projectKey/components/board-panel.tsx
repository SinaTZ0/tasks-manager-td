import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";

import { SidebarProvider, SidebarTrigger, useSidebar } from "#/components/primitive/sidebar/sidebar";
import {
  getBoardPanelClosed,
  getBoardPanelClosedOnServer,
  setBoardPanelClosed,
  subscribeToBoardPanel,
} from "#/lib/board-panel";
import { m } from "#/paraglide/messages";

/*===== Board Panel =====*/

/** The id of the project's sidebar, which the key controls. */
export const BOARD_PANEL_ID = "board-panel";

/**
 * Gives the project's sidebar the choice each person saved (`src/lib/board-panel.ts`). A component of its own so that
 * shrinking the sidebar re-renders this and the sidebar's parts, and not the page inside it.
 */
export function BoardPanelProvider({ children }: { children: ReactNode }) {
  const closed = useSyncExternalStore(subscribeToBoardPanel, getBoardPanelClosed, getBoardPanelClosedOnServer);

  return (
    <SidebarProvider
      open={!closed}
      onOpenChange={(open) => setBoardPanelClosed(!open)}
      className="min-h-0 min-w-0 flex-1"
    >
      {children}
    </SidebarProvider>
  );
}

/**
 * The key that shrinks the project's sidebar to its strip of icons and brings it back: a latch, sunk while the sidebar is
 * shrunk. The icon is chosen with CSS (`board-panel-closed:`), so it is right on the server-rendered page too, and
 * mirrors in Persian, where the sidebar is on the right.
 */
export function BoardPanelToggle({ className }: { className?: string }) {
  const { isMobile, open, openMobile } = useSidebar();

  return (
    <SidebarTrigger
      variant="secondary"
      size="icon-xs"
      aria-label={m.board_panel_hide()}
      title={m.board_panel_hide()}
      aria-pressed={isMobile ? !openMobile : !open}
      aria-controls={BOARD_PANEL_ID}
      className={className}
    >
      <PanelLeftCloseIcon className="rtl:-scale-x-100 board-panel-closed:hidden" />
      <PanelLeftOpenIcon className="hidden rtl:-scale-x-100 board-panel-closed:block" />
    </SidebarTrigger>
  );
}

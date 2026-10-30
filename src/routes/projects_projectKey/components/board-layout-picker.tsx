import { Columns3Icon, LayoutGridIcon, MoveHorizontalIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { ToggleGroup, ToggleGroupItem } from "#/components/primitive/toggle-group/toggle-group";
import {
  BOARD_PER_ROW,
  getBoardLayoutServerSnapshot,
  getBoardLayoutSnapshot,
  parseBoardLayout,
  setBoardLayout,
  subscribeToBoardLayout,
  type BoardLayoutMode,
  type BoardPerRow,
} from "#/lib/board-layout";
import { formatNumber } from "#/lib/locale";
import { m } from "#/paraglide/messages";

/*===== Board Layout Picker =====*/

const MODES = [
  { mode: "scroll", label: m.board_layout_scroll, Icon: MoveHorizontalIcon },
  { mode: "fit", label: m.board_layout_fit, Icon: Columns3Icon },
  { mode: "wrap", label: m.board_layout_wrap, Icon: LayoutGridIcon },
] as const satisfies readonly { mode: BoardLayoutMode; label: () => string; Icon: unknown }[];

/**
 * Latch keys for how the board lays out its columns (`src/lib/board-layout.ts`): one scrolling row, one row fitted to
 * the window, or several rows, with a second set of keys for how many columns go in each. The choice is this
 * browser's, so it is the same on every project.
 */
export function BoardLayoutPicker() {
  const layout = parseBoardLayout(
    useSyncExternalStore(subscribeToBoardLayout, getBoardLayoutSnapshot, getBoardLayoutServerSnapshot),
  );

  return (
    <div className="flex items-center gap-3">
      <ToggleGroup
        aria-label={m.board_layout()}
        size="sm"
        value={[layout.mode]}
        onValueChange={(next) => {
          // One layout is always chosen: pressing the latched key again reports an empty array.
          if (next[0]) setBoardLayout({ ...layout, mode: next[0] as BoardLayoutMode });
        }}
      >
        {MODES.map(({ mode, label, Icon }) => (
          <ToggleGroupItem key={mode} value={mode} aria-label={label()}>
            <Icon />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {layout.mode === "wrap" && (
        <ToggleGroup
          aria-label={m.board_layout_per_row()}
          size="sm"
          value={[String(layout.perRow)]}
          onValueChange={(next) => {
            if (next[0]) setBoardLayout({ ...layout, perRow: Number(next[0]) as BoardPerRow });
          }}
        >
          {BOARD_PER_ROW.map((count) => (
            <ToggleGroupItem key={count} value={String(count)}>
              {formatNumber(count)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  );
}

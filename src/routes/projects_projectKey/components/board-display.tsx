import type { ReactNode } from "react";

import { Display, DisplayButton, DisplayLabel, DisplayValue } from "#/components/primitive/display/display";
import { Led } from "#/components/primitive/led/led";
import { dueState } from "#/components/shared/due-mark/due-mark";
import { columnTitle } from "#/lib/column-title";
import { formatNumber } from "#/lib/locale";
import { cn } from "#/lib/utils";
import type { Column, Project } from "#/orpc/project/contract";
import type { Board } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { blockersOf, isHolding, kindsOf } from "#/routes/projects_projectKey/dependencies";

/*===== Board Display =====*/

/** A count on the glass. Not padded to two digits: a Persian zero is a dot, and "۰۲" in large type reads as "·۲". */
const pad = (value: number) => formatNumber(value);

/** Segments in a channel's level meter. */
const SEGMENTS = 8;

/**
 * The project's display: the glass at the top of the board, showing what the board holds right now. Each column is a
 * channel (its name, its card count in large digits, and a level meter of its share of the board's cards) and each
 * channel is also the key that shows or hides its column (`?hide=`), lit while the column is on the board. The last
 * column shown can't be let go: an empty board would look broken. Beside the channels, the counts that need someone:
 * tasks blocked, tasks late.
 *
 * The counts are the board's own, whatever the filters hide: the columns below say "3 of 9" while filtered.
 */
export function BoardDisplay({
  project,
  board,
  hidden,
  onHiddenChange,
}: {
  project: Project;
  board: Board;
  hidden: ReadonlySet<string>;
  /** The ids of the columns to hide, none of them the cancelled one. */
  onHiddenChange: (hidden: string[]) => void;
}) {
  const columns = project.columns.filter((column) => column.kind !== "cancelled");

  /*------ Readings ------*/
  const kinds = kindsOf(project);
  const tasks = new Map(board.tasks.map((task) => [task.id, task]));
  const live = board.tasks.filter((task) => kinds.get(task.columnId) !== "cancelled");
  const counts = new Map<string, number>();
  for (const task of live) counts.set(task.columnId, (counts.get(task.columnId) ?? 0) + 1);
  const total = live.length;
  const blocked = live.filter(
    (task) => isHolding(kinds.get(task.columnId)) && blockersOf({ task, tasks, kinds }).length > 0,
  ).length;
  const late = live.filter(
    (task) => task.dueDate && dueState({ dueDate: task.dueDate, finished: task.completedAt !== null }).tone === "late",
  ).length;

  const shown = columns.filter((column) => !hidden.has(column.id));
  const toggle = (column: Column) => {
    const showing = !hidden.has(column.id);
    if (showing && shown.length === 1) return;
    const next = new Set(hidden);
    if (showing) next.add(column.id);
    else next.delete(column.id);
    onHiddenChange(columns.filter((each) => next.has(each.id)).map((each) => each.id));
  };

  return (
    <Display className="min-w-0 flex-1">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {/*------ Channels ------*/}
        <fieldset className="min-w-0 flex-1">
          <legend className="mb-1">
            <DisplayLabel>{m.board_columns_shown()}</DisplayLabel>
          </legend>
          <div className="flex flex-wrap gap-1">
            {columns.map((column) => (
              <Channel
                key={column.id}
                column={column}
                count={counts.get(column.id) ?? 0}
                total={total}
                shown={!hidden.has(column.id)}
                onPress={() => toggle(column)}
              />
            ))}
          </div>
        </fieldset>

        {/*------ Needs Someone ------*/}
        <div className="flex flex-col gap-1 border-s border-glass-muted/30 ps-6">
          <DisplayLabel>{m.board_display_now()}</DisplayLabel>
          <dl className="flex flex-col gap-1 py-1">
            <Reading
              label={m.board_stat_blocked()}
              value={blocked}
              led={<Led signal="attention" state={blocked > 0 ? "on" : "off"} size="sm" />}
            />
            <Reading
              label={m.board_stat_late()}
              value={late}
              led={<Led signal="action" state={late > 0 ? "on" : "off"} size="sm" />}
            />
          </dl>
        </div>
      </div>
    </Display>
  );
}

/*===== Channel =====*/

/**
 * One column on the glass. The level meter lights one segment per eighth of the board's cards the column holds (at
 * least one when it holds any); past its WIP limit the meter and an LED turn yellow, and the count reads `count/limit`.
 */
function Channel({
  column,
  count,
  total,
  shown,
  onPress,
}: {
  column: Column;
  count: number;
  total: number;
  shown: boolean;
  onPress: () => void;
}) {
  const title = columnTitle(column);
  const overLimit = column.wipLimit !== null && count > column.wipLimit;
  const lit = count === 0 || total === 0 ? 0 : Math.max(1, Math.round((count / total) * SEGMENTS));

  return (
    <DisplayButton
      aria-pressed={shown}
      aria-label={m.board_channel_label({ column: title, count })}
      onClick={onPress}
      className="min-w-32 flex-1"
    >
      <span className="flex items-center gap-2">
        <Led signal="selection" state={shown ? "on" : "off"} size="sm" />
        <DisplayLabel>{title}</DisplayLabel>
        {overLimit && <Led signal="attention" state="on" size="sm" label={m.board_over_wip()} />}
      </span>
      <DisplayValue>{column.wipLimit === null ? pad(count) : `${pad(count)}/${pad(column.wipLimit)}`}</DisplayValue>
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-xs",
              index >= lit ? "bg-glass-foreground/15" : overLimit ? "bg-signal-attention" : "bg-glass-foreground",
            )}
          />
        ))}
      </span>
    </DisplayButton>
  );
}

/*===== Reading =====*/

/** One count beside the channels: an LED lit while the count needs someone, the name, and the count. */
function Reading({ label, value, led }: { label: string; value: number; led: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {led}
      <dt>
        <DisplayLabel>{label}</DisplayLabel>
      </dt>
      <dd className="ms-auto font-mono text-h4 tabular-nums">
        <bdi dir="ltr">{pad(value)}</bdi>
      </dd>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";

import { Button } from "#/components/primitive/button/button";
import { Led } from "#/components/primitive/led/led";
import { useNow } from "#/hooks/use-now";
import { formatClock, liveSeconds } from "#/lib/duration";
import { orpc } from "#/orpc/client";
import type { ColumnKind } from "#/orpc/project/constants";
import type { Project } from "#/orpc/project/contract";
import { isColumnAction } from "#/orpc/task/constants";
import type { TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { availableActions } from "#/routes/projects_projectKey/task-status";
import { useTaskTransition } from "#/routes/projects_projectKey/use-board-moves";

/*===== Task Work Key =====*/

/**
 * The latching key for the viewer's own clock (docs/app.md → Clock), at the start of the drawer's status track. Off, it
 * is a light key reading "Start working"; pressed, it runs the viewer's clock on the card (stopping whatever else they
 * were timing, rule 2) and latches as the orange key, orange being the app's recording colour, reading "Working" with
 * the task's time ticking beside it. Pressing it again stops the clock. Neither moves the card. Nothing shows on a task
 * whose clock can't run (a cancelled one); the clock's face and the time per person are in the tracking column.
 */
export function TaskWorkKey({ task, project }: { task: TaskDetail; project: Project }) {
  const transition = useTaskTransition(project);
  const { data: myTimer } = useQuery(orpc.time.current.queryOptions());
  const now = useNow();

  const kind: ColumnKind = project.columns.find((item) => item.id === task.columnId)?.kind ?? "todo";
  const timing = myTimer?.taskId === task.id;
  const action = availableActions({ kind, timing }).find((item) => !isColumnAction(item));
  if (!action) return null;

  const running = action === "pause";

  return (
    // One key for both states, so React keeps the element and its colour and width glide between them. Sunk while it
    // runs through `data-pressed`, not `aria-pressed`: the legend changes with the state, so the name says both what
    // is happening and what pressing does.
    <Button
      variant={running ? "highlight" : "secondary"}
      size="sm"
      data-pressed={running ? "" : undefined}
      aria-label={running ? m.task_work_running_label() : undefined}
      glide
      onClick={() => transition({ taskId: task.id, action })}
    >
      <Led signal="positive" state={running ? "blink" : "off"} size="sm" />
      {running ? m.task_work_running() : m.task_action_start()}
      {running && (
        // Not announced as it ticks; the time is read in the tracking column. Every digit one width, so the key keeps
        // its width as the seconds change (Persian digits come from Vazirmatn, whose own digits differ in width).
        <bdi dir="ltr" aria-hidden="true" className="font-mono tabular-nums">
          {formatClock(liveSeconds({ ...task, now }))}
        </bdi>
      )}
    </Button>
  );
}

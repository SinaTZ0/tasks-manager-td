import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LockIcon, XIcon } from "lucide-react";
import { useId } from "react";

import { Button } from "#/components/primitive/button/button";
import { Field, FieldLabel } from "#/components/primitive/field/field";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { ColumnKind } from "#/orpc/project/constants";
import type { Project } from "#/orpc/project/contract";
import { taskCode } from "#/orpc/task/constants";
import type { Board, TaskCard, TaskDetail } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { isHolding } from "#/routes/projects_projectKey/dependencies";

/*===== Task Dependencies =====*/

/**
 * The drawer's dependencies (docs/app.md → Dependency): the tasks this one waits for, each lit yellow while it still
 * holds this one up and green once done or cancelled, with a key to stop waiting for it; a picker to add another; and
 * the tasks waiting for this one. Each code opens that task. A link that would close a loop is refused by the server,
 * which says so.
 */
export function TaskDependencies({
  task,
  project,
  board,
  kinds,
  readOnly,
}: {
  task: TaskDetail;
  project: Project;
  board: Board;
  kinds: Map<string, ColumnKind>;
  /** A viewer sees the links, and neither adds nor removes one. */
  readOnly: boolean;
}) {
  const queryClient = useQueryClient();
  const pickerId = useId();
  const tasks = new Map(board.tasks.map((item) => [item.id, item]));
  const waitsFor = task.waitsFor.map((id) => tasks.get(id)).filter((item) => item !== undefined);
  const holdsUp = board.tasks.filter((item) => item.waitsFor.includes(task.id));
  const candidates = board.tasks.filter((item) => item.id !== task.id && !task.waitsFor.includes(item.id));
  const codeOf = (item: TaskCard) => taskCode({ key: project.key, number: item.number });

  const options = {
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.task.get.key() }),
      ]),
    onError: (error: unknown) => {
      const failure = describeApiFailure({ error, fallback: m.dependency_save_failed() });
      toast.add({
        title: Object.values(failure.fields)[0] ?? failure.message ?? m.dependency_save_failed(),
        type: "error",
      });
    },
  };
  const add = useMutation(orpc.dependency.add.mutationOptions(options));
  const remove = useMutation(orpc.dependency.remove.mutationOptions(options));
  const items = candidates.map((item) => ({ value: item.id, label: `${codeOf(item)} ${item.title}` }));

  return (
    <section aria-labelledby="task-dependencies-title" className="flex flex-col gap-4">
      <h3 id="task-dependencies-title" className="flex items-center gap-2 font-heading text-h4">
        <LockIcon aria-hidden="true" className="size-4" />
        {m.dependency_title()}
      </h3>

      {/*------ Waits For ------*/}
      <div className="flex flex-col gap-2">
        <h4 className="text-body-sm font-semibold">{m.dependency_waits_for()}</h4>
        {waitsFor.length > 0 ? (
          <ul className="flex flex-col striped">
            {waitsFor.map((blocker) => {
              const holding = isHolding(kinds.get(blocker.columnId));
              const code = codeOf(blocker);
              return (
                <li key={blocker.id} className="flex items-center gap-3 py-2">
                  <Led signal={holding ? "attention" : "positive"} state="on" size="sm" />
                  <TaskLink code={code} title={blocker.title} />
                  <Marking className="ms-auto">
                    {holding ? m.dependency_state_waiting() : m.dependency_state_released()}
                  </Marking>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={m.dependency_remove({ code })}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ projectId: project.id, taskId: task.id, blockerId: blocker.id })}
                    >
                      <XIcon />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-body-sm text-muted-foreground">{m.dependency_none()}</p>
        )}
      </div>

      {/*------ Add ------*/}
      {candidates.length > 0 && !readOnly && (
        <Field>
          <FieldLabel htmlFor={pickerId}>{m.dependency_add_label()}</FieldLabel>
          {/* Picking a task adds it at once; the picker then goes back to empty. */}
          <Select
            items={items}
            value={null}
            disabled={add.isPending}
            onValueChange={(blockerId) =>
              blockerId && add.mutate({ projectId: project.id, taskId: task.id, blockerId: String(blockerId) })
            }
          >
            <SelectTrigger id={pickerId} className="w-full">
              <SelectValue placeholder={m.dependency_add_placeholder()} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {/*------ Holds Up ------*/}
      {holdsUp.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-body-sm font-semibold">{m.dependency_holds_up()}</h4>
          <ul className="flex flex-col gap-2">
            {holdsUp.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <TaskLink code={codeOf(item)} title={item.title} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/*===== Task Link =====*/

/** A task's code and title, opening that task's drawer in place of this one. */
function TaskLink({ code, title }: { code: string; title: string }) {
  return (
    <Link
      from="/projects/$projectKey"
      search={(previous) => ({ ...previous, task: code })}
      className="flex min-w-0 items-baseline gap-2 rounded-chassis outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Marking variant="code">{code}</Marking>
      <span className="truncate text-body-sm">{title}</span>
    </Link>
  );
}

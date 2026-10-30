import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/primitive/input-group/input-group";
import { toast } from "#/components/primitive/toast/toast";
import { describeApiFailure } from "#/lib/api-error";
import { normalizePersianText } from "#/lib/persian-text";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages";

/*===== Quick Add =====*/

/**
 * The field at the bottom of a column: type a title, press Enter, and the task is on the board (docs/app.md → Quick
 * add). The field stays focused and empties, so several tasks go in one after another. Escape clears it.
 */
export function QuickAdd({
  projectId,
  columnId,
  columnTitle,
}: {
  projectId: string;
  columnId: string;
  columnTitle: string;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const id = useId();

  const create = useMutation(
    orpc.task.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.task.board.key() }),
      onError: (error, variables) => {
        // Give the title back, so nothing typed is lost.
        setTitle((current) => current || variables.title);
        const failure = describeApiFailure({ error, fallback: m.task_save_failed() });
        toast.add({
          title: failure.message ?? Object.values(failure.fields)[0] ?? m.task_save_failed(),
          type: "error",
        });
      },
    }),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") setTitle("");
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const clean = normalizePersianText(title);
    if (!clean) return;
    create.mutate({ projectId, columnId, title: clean });
    setTitle("");
  };

  return (
    <InputGroup>
      <InputGroupAddon>
        <PlusIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={m.task_quick_add_placeholder()}
        aria-label={m.task_quick_add_label({ column: columnTitle })}
        autoComplete="off"
      />
    </InputGroup>
  );
}

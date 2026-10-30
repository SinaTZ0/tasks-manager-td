import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { toast } from "#/components/primitive/toast/toast";
import { PeopleChecklist } from "#/components/shared/people-checklist/people-checklist";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { Project } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";

/*===== Members =====*/

/**
 * Who is on the project: a check key per active teammate, saved as soon as it is pressed. A deactivated member stays
 * listed (and can be taken off) until removed, but nobody deactivated can be added.
 */
export function MembersForm({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const { data: team } = useSuspenseQuery(orpc.team.list.queryOptions());
  const memberIds = project.members.map((member) => member.id);
  const people = team.filter((person) => person.status === "active" || memberIds.includes(person.id));

  const setMember = useMutation(
    orpc.project.setMember.mutationOptions({
      onSuccess: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.project.get.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.project.list.key() }),
        ]),
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.settings_save_failed() });
        toast.add({ title: failure.message ?? Object.values(failure.fields)[0], type: "error" });
      },
    }),
  );
  // The pressed key stays down until the project refetches, so it can't be pressed twice.
  const pendingId = setMember.isPending ? setMember.variables.userId : null;

  return (
    <PeopleChecklist
      people={people}
      selectedIds={pendingId ? toggled(memberIds, pendingId, setMember.variables?.member ?? false) : memberIds}
      disabledIds={pendingId ? [pendingId] : []}
      onToggle={(userId, member) => setMember.mutate({ projectId: project.id, userId, member })}
    />
  );
}

/** The ids with one added or taken away, to show a change while it saves. */
function toggled(ids: string[], id: string, include: boolean): string[] {
  return include ? [...new Set([...ids, id])] : ids.filter((value) => value !== id);
}

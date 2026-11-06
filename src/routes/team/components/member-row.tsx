import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";

import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { Switch } from "#/components/primitive/switch/switch";
import { toast } from "#/components/primitive/toast/toast";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";
import { describeApiFailure } from "#/lib/api-error";
import { orpc } from "#/orpc/client";
import type { TeamMember } from "#/orpc/team/contract";
import { m } from "#/paraglide/messages";
import { ResetPasswordDialog } from "#/routes/team/components/reset-password-dialog";
import { roleItems } from "#/routes/team/role-labels";

/*===== Member Row =====*/

/**
 * One teammate: who they are, their role, whether their account is active, and a key that gives them a new password.
 * An admin's own row is read-only: the server refuses changes to one's own account, so the team can't lose its last
 * admin by accident. A viewer who still has open tasks says how many, so the admin can hand them on.
 */
export function MemberRow({ member, isSelf }: { member: TeamMember; isSelf: boolean }) {
  const queryClient = useQueryClient();
  const roles = roleItems();
  const ids = { role: useId(), status: useId() };
  const mutationOptions = {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.team.list.key() }),
    onError: (error: unknown) => {
      const failure = describeApiFailure({ error, fallback: m.team_save_failed() });
      toast.add({ title: failure.message ?? m.team_save_failed(), type: "error" });
    },
  };
  const setRole = useMutation(orpc.team.setRole.mutationOptions(mutationOptions));
  const setStatus = useMutation(orpc.team.setStatus.mutationOptions(mutationOptions));

  const active = member.status === "active";
  const role = setRole.isPending ? setRole.variables.role : member.role;
  const checked = setStatus.isPending ? setStatus.variables.status === "active" : active;

  return (
    <li className="flex items-center gap-x-6 gap-y-3 py-3 max-md:flex-wrap">
      {/*------ Who ------*/}
      <div className="flex min-w-0 flex-1 items-center gap-3 max-md:basis-full">
        <PersonAvatar name={member.name} size="default" decorative />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium">
            {member.name}
            {isSelf && <Marking>{m.team_you()}</Marking>}
          </p>
          <p dir="ltr" className="truncate text-start text-caption text-muted-foreground">
            {member.email}
          </p>
          {role === "viewer" && member.openTasks > 0 && (
            <p className="flex items-center gap-2 text-caption">
              <Led signal="attention" state="on" size="sm" />
              {m.team_open_tasks({ count: member.openTasks })}
            </p>
          )}
        </div>
      </div>

      {/*------ Role ------*/}
      <Select
        items={roles}
        value={role}
        disabled={isSelf || setRole.isPending}
        onValueChange={(value) => value && setRole.mutate({ userId: member.id, role: value })}
      >
        <SelectTrigger id={ids.role} aria-label={m.team_role_of({ name: member.name })} className="w-44 max-md:w-full">
          <SelectValue />
        </SelectTrigger>
        {/* Wider than the key, so each role's line about what it may do fits; it opens below rather than over it. */}
        <SelectContent alignItemWithTrigger={false} align="start" className="w-80">
          {roles.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <span className="flex flex-col">
                {item.label}
                <span className="text-caption whitespace-normal text-muted-foreground">{item.hint}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/*------ Status ------*/}
      <label htmlFor={ids.status} className="flex w-40 items-center gap-3 max-md:flex-1">
        <Switch
          id={ids.status}
          checked={checked}
          disabled={isSelf || setStatus.isPending}
          onCheckedChange={(next) => setStatus.mutate({ userId: member.id, status: next ? "active" : "blocked" })}
        />
        <span className="flex items-center gap-2">
          <Led signal={checked ? "positive" : "attention"} state={checked ? "on" : "off"} size="sm" />
          {checked ? m.team_status_active() : m.team_status_blocked()}
        </span>
      </label>

      {/*------ Password ------*/}
      <ResetPasswordDialog member={member} disabled={isSelf} />
    </li>
  );
}

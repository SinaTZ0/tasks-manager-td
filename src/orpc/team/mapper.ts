import { USER_ROLES, USER_STATUSES } from "#/lib/user-constants";
import { oneOf } from "#/orpc/allowed-values";
import type { TeamMember } from "#/orpc/team/contract";
import type { UserRecord } from "#/orpc/team/repository";

/*===== Public Member =====*/
/** Converts an account row into the admin list's shape, without its auth fields. */
export function toTeamMember(record: UserRecord): TeamMember {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: oneOf({ allowed: USER_ROLES, value: record.role, what: "user role" }),
    status: oneOf({ allowed: USER_STATUSES, value: record.status, what: "user status" }),
    createdAt: record.createdAt,
  };
}

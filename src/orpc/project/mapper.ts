import { mediaUrl } from "#/lib/storage.server";
import { USER_ROLES, USER_STATUSES } from "#/lib/user-constants";
import { oneOf } from "#/orpc/allowed-values";
import type { Column, Person, ProjectSummary } from "#/orpc/project/contract";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import type { ColumnRecord, MemberRow, ProjectRecord } from "#/orpc/project/repository";

/*===== Public Shapes =====*/
/** The small variant of someone's picture (`user.avatar_media_id`), or null for none: pages then show their initial. */
export function avatarUrlOf(mediaId: string | null | undefined): string | null {
  return mediaId ? mediaUrl({ kind: "avatar", mediaId, variant: "thumb" }) : null;
}

export function toPerson(row: Pick<MemberRow, "id" | "name" | "role" | "status" | "avatarMediaId">): Person {
  return {
    id: row.id,
    name: row.name,
    role: oneOf({ allowed: USER_ROLES, value: row.role, what: "user role" }),
    status: oneOf({ allowed: USER_STATUSES, value: row.status, what: "user status" }),
    avatarUrl: avatarUrlOf(row.avatarMediaId),
  };
}

/** A project with its members, taken from the rows of `findMembersOfProjects` that belong to it. */
export function toProjectSummary({ record, members }: { record: ProjectRecord; members: MemberRow[] }): ProjectSummary {
  return {
    id: record.id,
    name: record.name,
    key: record.key,
    members: members.filter((member) => member.projectId === record.id).map(toPerson),
  };
}

export function toColumn(record: ColumnRecord): Column {
  return {
    id: record.id,
    kind: oneOf({ allowed: COLUMN_KINDS, value: record.kind, what: "column kind" }),
    name: record.name,
    position: record.position,
    wipLimit: record.wipLimit,
  };
}

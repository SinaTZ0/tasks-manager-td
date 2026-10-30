import { USER_STATUSES } from "#/lib/user-constants";
import { oneOf } from "#/orpc/allowed-values";
import type { Column, Person, ProjectSummary } from "#/orpc/project/contract";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import type { ColumnRecord, MemberRow, ProjectRecord } from "#/orpc/project/repository";

/*===== Public Shapes =====*/
export function toPerson(row: Pick<MemberRow, "id" | "name" | "status">): Person {
  return {
    id: row.id,
    name: row.name,
    status: oneOf({ allowed: USER_STATUSES, value: row.status, what: "user status" }),
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

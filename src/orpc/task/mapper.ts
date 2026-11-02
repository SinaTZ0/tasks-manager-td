import type { RichTextDoc } from "#/lib/rich-text";
import { oneOf } from "#/orpc/allowed-values";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import { LABEL_COLORS, TASK_PRIORITIES } from "#/orpc/task/constants";
import type { Label, MyTask, TaskCard, TaskDetail } from "#/orpc/task/contract";
import type { AssignedTaskRow, LabelRecord, TaskRecord } from "#/orpc/task/repository";

/*===== Public Shapes =====*/
const NO_COUNTS: TaskCard["counts"] = { comments: 0, attachments: 0, checklistDone: 0, checklistTotal: 0 };

export function toTaskCard({
  record,
  assigneeIds,
  labelIds,
  waitsFor = [],
  counts = NO_COUNTS,
}: {
  record: TaskRecord;
  assigneeIds: string[];
  labelIds: string[];
  waitsFor?: string[];
  counts?: TaskCard["counts"] | undefined;
}): TaskCard {
  return {
    id: record.id,
    number: record.number,
    columnId: record.columnId,
    position: record.position,
    title: record.title,
    priority: oneOf({ allowed: TASK_PRIORITIES, value: record.priority, what: "task priority" }),
    dueDate: record.dueDate,
    estimateMinutes: record.estimateMinutes,
    ownerId: record.ownerId,
    assigneeIds,
    labelIds,
    hasDescription: record.descriptionText.length > 0,
    completedAt: record.completedAt,
    waitsFor,
    counts,
  };
}

export function toMyTask({ row }: { row: AssignedTaskRow }): MyTask {
  return {
    ...row,
    priority: oneOf({ allowed: TASK_PRIORITIES, value: row.priority, what: "task priority" }),
    columnKind: oneOf({ allowed: COLUMN_KINDS, value: row.columnKind, what: "column kind" }),
  };
}

export function toTaskDetail({
  record,
  assigneeIds,
  labelIds,
  waitsFor,
  statusNote,
  handoffs,
  checklist,
  attachments,
  watchers,
  comments,
}: {
  record: TaskRecord;
  assigneeIds: string[];
  labelIds: string[];
  waitsFor: string[];
  statusNote: TaskDetail["statusNote"];
  handoffs: TaskDetail["handoffs"];
  checklist: TaskDetail["checklist"];
  attachments: TaskDetail["attachments"];
  watchers: TaskDetail["watchers"];
  /** How many comments it has, deleted ones left out. */
  comments: number;
}): TaskDetail {
  const counts = {
    comments,
    attachments: attachments.length,
    checklistDone: checklist.filter((item) => item.doneAt !== null).length,
    checklistTotal: checklist.length,
  };
  return {
    ...toTaskCard({ record, assigneeIds, labelIds, waitsFor, counts }),
    description: (record.description as RichTextDoc | null) ?? null,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt,
    statusNote,
    handoffs,
    checklist,
    attachments,
    watchers,
  };
}

export function toLabel(record: LabelRecord): Label {
  return {
    id: record.id,
    name: record.name,
    color: oneOf({ allowed: LABEL_COLORS, value: record.color, what: "label color" }),
  };
}

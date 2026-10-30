import type { RichTextDoc } from "#/lib/rich-text";
import { oneOf } from "#/orpc/allowed-values";
import { COLUMN_KINDS } from "#/orpc/project/constants";
import { LABEL_COLORS, TASK_PRIORITIES } from "#/orpc/task/constants";
import type { Label, MyTask, TaskCard, TaskDetail } from "#/orpc/task/contract";
import type { AssignedTaskRow, LabelRecord, TaskRecord } from "#/orpc/task/repository";
import type { TimeTotals } from "#/orpc/time/repository";

/*===== Public Shapes =====*/
const NO_COUNTS: TaskCard["counts"] = { comments: 0, attachments: 0, checklistDone: 0, checklistTotal: 0 };

export function toTaskCard({
  record,
  labelIds,
  time = { spentSeconds: 0, runningSince: [] },
  waitsFor = [],
  counts = NO_COUNTS,
}: {
  record: TaskRecord;
  labelIds: string[];
  time?: TimeTotals | undefined;
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
    assigneeId: record.assigneeId,
    labelIds,
    hasDescription: record.descriptionText.length > 0,
    completedAt: record.completedAt,
    spentSeconds: time.spentSeconds,
    runningSince: time.runningSince,
    waitsFor,
    counts,
  };
}

export function toMyTask({ row, time }: { row: AssignedTaskRow; time: TimeTotals | undefined }): MyTask {
  return {
    ...row,
    priority: oneOf({ allowed: TASK_PRIORITIES, value: row.priority, what: "task priority" }),
    columnKind: oneOf({ allowed: COLUMN_KINDS, value: row.columnKind, what: "column kind" }),
    spentSeconds: time?.spentSeconds ?? 0,
    runningSince: time?.runningSince ?? [],
  };
}

export function toTaskDetail({
  record,
  labelIds,
  time,
  waitsFor,
  statusNote,
  handoffs,
  checklist,
  attachments,
  comments,
}: {
  record: TaskRecord;
  labelIds: string[];
  time: TimeTotals | undefined;
  waitsFor: string[];
  statusNote: TaskDetail["statusNote"];
  handoffs: TaskDetail["handoffs"];
  checklist: TaskDetail["checklist"];
  attachments: TaskDetail["attachments"];
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
    ...toTaskCard({ record, labelIds, time, waitsFor, counts }),
    description: (record.description as RichTextDoc | null) ?? null,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt,
    statusNote,
    handoffs,
    checklist,
    attachments,
  };
}

export function toLabel(record: LabelRecord): Label {
  return {
    id: record.id,
    name: record.name,
    color: oneOf({ allowed: LABEL_COLORS, value: record.color, what: "label color" }),
  };
}

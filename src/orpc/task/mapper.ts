import type { RichTextDoc } from "#/lib/rich-text";
import { oneOf } from "#/orpc/allowed-values";
import { LABEL_COLORS, TASK_PRIORITIES } from "#/orpc/task/constants";
import type { Label, TaskCard, TaskDetail } from "#/orpc/task/contract";
import type { LabelRecord, TaskRecord } from "#/orpc/task/repository";

/*===== Public Shapes =====*/
export function toTaskCard({ record, labelIds }: { record: TaskRecord; labelIds: string[] }): TaskCard {
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
  };
}

export function toTaskDetail({ record, labelIds }: { record: TaskRecord; labelIds: string[] }): TaskDetail {
  return {
    ...toTaskCard({ record, labelIds }),
    description: (record.description as RichTextDoc | null) ?? null,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt,
  };
}

export function toLabel(record: LabelRecord): Label {
  return {
    id: record.id,
    name: record.name,
    color: oneOf({ allowed: LABEL_COLORS, value: record.color, what: "label color" }),
  };
}

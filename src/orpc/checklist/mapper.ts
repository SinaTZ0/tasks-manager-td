import type { ChecklistItem } from "#/orpc/checklist/contract";
import type { ChecklistItemRecord } from "#/orpc/checklist/repository";

/*===== Checklist Item =====*/
export function toChecklistItem(record: ChecklistItemRecord): ChecklistItem {
  return {
    id: record.id,
    text: record.text,
    position: record.position,
    doneAt: record.doneAt,
    doneBy: record.doneBy,
  };
}

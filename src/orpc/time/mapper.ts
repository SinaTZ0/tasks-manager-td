import type { TimeLog } from "#/orpc/time/contract";
import type { TimeLogRecord } from "#/orpc/time/repository";

/*===== Public Shapes =====*/
export function toTimeLog(record: TimeLogRecord): TimeLog {
  return {
    id: record.id,
    userId: record.userId,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    manual: record.manual,
    note: record.note,
  };
}

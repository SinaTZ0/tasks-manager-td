import { objectUrl } from "#/lib/storage.server";
import { oneOf } from "#/orpc/allowed-values";
import { ATTACHMENT_KINDS } from "#/orpc/attachment/constants";
import type { Attachment } from "#/orpc/attachment/contract";
import { fileKey, previewKey } from "#/orpc/attachment/files.server";
import type { AttachmentRecord } from "#/orpc/attachment/repository";

/*===== Attachment =====*/
export function toAttachment(record: AttachmentRecord): Attachment {
  const kind = oneOf({ allowed: ATTACHMENT_KINDS, value: record.kind, what: "attachment kind" });
  const hasPreview = record.previewWidth !== null && record.previewHeight !== null;
  return {
    id: record.id,
    kind,
    name: record.name,
    url: kind === "link" ? (record.url ?? "") : objectUrl(fileKey(record.id)),
    preview: hasPreview
      ? { url: objectUrl(previewKey(record.id)), width: record.previewWidth ?? 0, height: record.previewHeight ?? 0 }
      : null,
    size: record.size,
    addedBy: record.addedBy,
    createdAt: record.createdAt,
  };
}

/*===== Attachment Constants =====*/
// Browser-safe: the drawer checks a file's size before sending it, and prints the limits in its messages.

/** A file uploaded to the card, or a link to something elsewhere. Stored as plain text (`attachment.kind`). */
export const ATTACHMENT_KINDS = ["file", "link"] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/** The largest file a card takes. Caddy's `request_body` limit (deploy/Caddyfile) leaves room above it. */
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

/** Enough for any real card; more belongs in a shared folder linked from it. */
export const ATTACHMENT_MAX_PER_TASK = 50;

export const ATTACHMENT_NAME_MAX_LENGTH = 200;
export const ATTACHMENT_URL_MAX_LENGTH = 2000;

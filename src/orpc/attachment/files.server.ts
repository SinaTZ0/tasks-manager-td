import sharp from "sharp";

import { createLogger } from "#/lib/logger.server";
import { copyObject, deleteObjects, putObject } from "#/lib/storage.server";
import { span } from "#/lib/trace.server";
import { ATTACHMENT_NAME_MAX_LENGTH } from "#/orpc/attachment/constants";

const log = createLogger("attachment");

/*===== Keys =====*/
// `attachment/{id}/file` holds the file as it was uploaded; an image also gets `attachment/{id}/preview.webp`. Caddy
// serves exactly these two shapes (deploy/Caddyfile).

export const fileKey = (id: string) => `attachment/${id}/file`;
export const previewKey = (id: string) => `attachment/${id}/preview.webp`;

/** Every key an attachment may have. Deleting a key that was never written is fine, so a link or a plain file is too. */
export const attachmentKeys = (id: string) => [fileKey(id), previewKey(id)];

/*===== Images =====*/
/**
 * Formats a browser shows on its own: only these are served inline, as their real type (read by sharp, never taken
 * from the name). Anything else (SVG and HTML included, which could run script on the app's origin) downloads.
 */
const INLINE_FORMATS = ["jpeg", "png", "webp", "gif", "avif"];

const MAX_PIXELS = 40_000_000;
const PREVIEW_SIZE = 640;

type Preview = { body: Buffer; width: number; height: number };

/** The image's real format and a WebP preview fitted in `PREVIEW_SIZE`, or null for a file that isn't one we show. */
async function readImage(input: Buffer): Promise<{ format: string; preview: Preview } | null> {
  try {
    const options = { limitInputPixels: MAX_PIXELS };
    const metadata = await sharp(input, options).metadata();
    if (!metadata.format || !INLINE_FORMATS.includes(metadata.format)) return null;
    // `rotate()` applies the EXIF orientation; WebP output carries no metadata, so the preview never keeps GPS.
    const { data, info } = await sharp(input, options)
      .rotate()
      .resize({ width: PREVIEW_SIZE, height: PREVIEW_SIZE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    return { format: metadata.format, preview: { body: data, width: info.width, height: info.height } };
  } catch {
    // Not an image sharp can read (or too large to decode): it is still a file, just without a preview.
    return null;
  }
}

/*===== Names =====*/
/**
 * The file's name as the drawer shows it and the download saves it: no folders, no control characters, at most
 * `ATTACHMENT_NAME_MAX_LENGTH` characters with the extension kept.
 */
export function cleanFileName(raw: string): string {
  const base = (raw.split(/[/\\]/).pop() ?? "")
    // oxlint-disable-next-line no-control-regex -- control characters are exactly what is removed
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .normalize("NFC")
    .trim();
  if (!base) return "file";
  if (base.length <= ATTACHMENT_NAME_MAX_LENGTH) return base;
  const dot = base.lastIndexOf(".");
  const extension = dot > 0 && base.length - dot <= 12 ? base.slice(dot) : "";
  return base.slice(0, ATTACHMENT_NAME_MAX_LENGTH - extension.length) + extension;
}

/** `inline` or `attachment`, with the name for browsers that read only ASCII and the full one in UTF-8 (RFC 6266). */
function dispositionOf({ inline, name }: { inline: boolean; name: string }): string {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/*===== Store =====*/
export type StoredFile = { name: string; contentType: string; size: number; preview: Omit<Preview, "body"> | null };

/**
 * Puts a file (and an image's preview) into the bucket under the attachment's id. An image is stored as its real type
 * and shown; anything else as `application/octet-stream` and downloaded.
 *
 * @throws When the bucket fails. Whatever was written is deleted first.
 */
export async function storeFile({ id, file }: { id: string; file: File }): Promise<StoredFile> {
  const name = cleanFileName(file.name);
  const body = Buffer.from(await file.arrayBuffer());
  const image = await span({ kind: "task", name: "attachment.readImage" }, () => readImage(body));
  const contentType = image ? `image/${image.format}` : "application/octet-stream";

  try {
    const writes = await Promise.allSettled([
      putObject({ key: fileKey(id), body, contentType, contentDisposition: dispositionOf({ inline: !!image, name }) }),
      ...(image ? [putObject({ key: previewKey(id), body: image.preview.body, contentType: "image/webp" })] : []),
    ]);
    const failed = writes.find((write) => write.status === "rejected");
    if (failed) throw failed.reason;
  } catch (error) {
    await discardFiles([id]);
    throw error;
  }

  return {
    name,
    contentType,
    size: body.length,
    preview: image ? { width: image.preview.width, height: image.preview.height } : null,
  };
}

/**
 * Copies attachments' files to new ids (a copied card's, slice 20): the file, and the preview where there is one.
 *
 * @throws When the bucket fails. Whatever was copied is deleted first.
 */
export async function copyFiles(copies: { fromId: string; toId: string; preview: boolean }[]): Promise<void> {
  try {
    for (const { fromId, toId, preview } of copies) {
      await copyObject({ from: fileKey(fromId), to: fileKey(toId) });
      if (preview) await copyObject({ from: previewKey(fromId), to: previewKey(toId) });
    }
  } catch (error) {
    await discardFiles(copies.map((copy) => copy.toId));
    throw error;
  }
}

/**
 * Deletes attachments' files once the rows that pointed at them are gone. A failure is logged, not thrown: the change
 * is already saved, and the files' URLs are no longer listed anywhere.
 */
export async function discardFiles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await deleteObjects({ keys: ids.flatMap(attachmentKeys) });
  } catch (error) {
    log.error({ err: error, ids }, "could not delete attachment files");
  }
}

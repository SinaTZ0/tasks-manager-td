import { z } from "zod";

import { parseRichText, type RichTextDoc } from "#/lib/rich-text";
import { COMMENT_MAX_LENGTH } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Body =====*/
/** A comment's Tiptap document: one the editor could have made, with some text, and not too long. */
export const commentBodySchema = z.unknown().transform((value, ctx): { doc: RichTextDoc; text: string } => {
  const parsed = parseRichText(value);
  if (!parsed) {
    ctx.addIssue({ code: "custom", message: m.comment_error_invalid() });
    return z.NEVER;
  }
  if (parsed.text.length === 0) {
    ctx.addIssue({ code: "custom", message: m.comment_error_required() });
    return z.NEVER;
  }
  if (parsed.text.length > COMMENT_MAX_LENGTH) {
    ctx.addIssue({ code: "custom", message: m.comment_error_too_long({ max: COMMENT_MAX_LENGTH }) });
    return z.NEVER;
  }
  return parsed;
});

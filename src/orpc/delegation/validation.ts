import { persianText } from "#/lib/persian-text";
import { DELEGATION_NOTE_MAX_LENGTH } from "#/orpc/delegation/constants";
import { m } from "#/paraglide/messages";

/*===== Note =====*/
/** What the new assignee should know. Optional; an empty note is no note. */
export const delegationNoteSchema = persianText()
  .max(DELEGATION_NOTE_MAX_LENGTH, {
    error: () => m.delegation_error_note_too_long({ max: DELEGATION_NOTE_MAX_LENGTH }),
  })
  .optional()
  .transform((note) => note || null);

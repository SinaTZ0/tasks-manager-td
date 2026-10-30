import { persianText } from "#/lib/persian-text";
import { CHECKLIST_TEXT_MAX_LENGTH } from "#/orpc/checklist/constants";
import { m } from "#/paraglide/messages";

/*===== Item Text =====*/
// Normalized (`persianText`) before its limits are checked; the messages reach the person as the field's error.
export const checklistTextSchema = persianText()
  .min(1, { error: () => m.checklist_error_text_required() })
  .max(CHECKLIST_TEXT_MAX_LENGTH, {
    error: () => m.checklist_error_text_too_long({ max: CHECKLIST_TEXT_MAX_LENGTH }),
  });

import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors, roleErrors } from "#/orpc/middleware/auth/auth.errors";
import { projectAccessErrors } from "#/orpc/middleware/project-access/project-access.errors";

/*===== Schemas =====*/
/** One step of a card's checklist, in list order on the task's details. */
export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  position: z.string(),
  /** Who ticked it and when; null while open. */
  doneAt: z.date().nullable(),
  doneBy: z.string().nullable(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

/*===== Procedures =====*/
// `projectAccessErrors` carries NOT_FOUND, which also answers an item or task the project doesn't have. Every change
// is for editors (`requireEditorMiddleware`): a viewer reads the list on the task's details.
const errors = { ...commonErrors, ...authErrors, ...roleErrors, ...projectAccessErrors };

export const checklistContract = {
  /** Adds an item at the end of the task's list. */
  add: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), taskId: z.string(), text: z.string() }))
    .output(checklistItemSchema),
  /** Renames an item, or ticks or unticks it. */
  update: oc
    .errors(errors)
    .input(
      z.strictObject({
        projectId: z.string(),
        itemId: z.string(),
        text: z.string().optional(),
        done: z.boolean().optional(),
      }),
    )
    .output(checklistItemSchema),
  /** Moves an item to `position`, the key the drawer computed between its new neighbours (`src/lib/position.ts`). */
  move: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), itemId: z.string(), position: z.string() }))
    .output(z.void()),
  remove: oc
    .errors(errors)
    .input(z.strictObject({ projectId: z.string(), itemId: z.string() }))
    .output(z.void()),
};

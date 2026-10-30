import { asyncIteratorObject, oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";

/*===== Schemas =====*/
/**
 * What the stream tells a signed-in page. It never carries data: the page refetches the queries it names, through the
 * usual procedures and their checks.
 *
 * - `ready`: the stream is open (first event, and again after the server lost its own connection to the database).
 *   Changes may have been missed before it, so the page refetches everything it shows.
 * - `project`: something in this project changed.
 * - `notification`: the viewer has a new notification.
 */
export const liveEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("project"), projectId: z.string() }),
  z.object({ type: z.literal("notification") }),
]);

export type LiveEvent = z.infer<typeof liveEventSchema>;

/*===== Procedures =====*/
export const liveContract = {
  /** Server-sent events for the viewer: changes in the projects they can open, and their own notifications. */
  events: oc.errors({ ...commonErrors, ...authErrors }).output(asyncIteratorObject(liveEventSchema)),
};

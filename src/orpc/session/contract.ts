import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";

/*===== Schemas =====*/
/** The signed-in person, as pages see them. Visitors are `null`, not a viewer. */
const viewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  /** Their picture's small variant, or null for none (the header shows their initial). */
  avatarUrl: z.string().nullable(),
});

export type Viewer = z.infer<typeof viewerSchema>;

/*===== Procedures =====*/
// Public: a visitor gets `null`, not `UNAUTHORIZED`, so no `authErrors`.
export const viewerContract = oc.errors(commonErrors).output(viewerSchema.nullable());

export const sessionContract = {
  viewer: viewerContract,
};

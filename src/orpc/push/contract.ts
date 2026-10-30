import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors } from "#/orpc/errors";
import { authErrors } from "#/orpc/middleware/auth/auth.errors";

/*===== Procedures =====*/
const errors = { ...commonErrors, ...authErrors };

export const pushContract = {
  /** The server's VAPID public key, which a browser subscribes with. */
  config: oc.errors(errors).output(z.object({ publicKey: z.string() })),
  /**
   * Keeps this browser's subscription for the viewer, in the browser's language. Subscribing again (another language,
   * or another person on the same browser) replaces it.
   */
  subscribe: oc
    .errors(errors)
    .input(
      z.strictObject({
        endpoint: z.url({ protocol: /^https$/ }).max(2000),
        keys: z.strictObject({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
        locale: z.enum(["fa", "en"]),
      }),
    )
    .output(z.void()),
  /** Forgets this browser's subscription, if it is the viewer's. */
  unsubscribe: oc
    .errors(errors)
    .input(z.strictObject({ endpoint: z.string().max(2000) }))
    .output(z.void()),
};

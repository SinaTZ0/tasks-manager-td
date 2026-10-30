import { createECDH, hkdfSync } from "node:crypto";

import { env } from "#/env.server";

/*===== VAPID Keys =====*/
// The key pair that signs every push request (RFC 8292), so push services accept them as this server's. It is derived
// from `BETTER_AUTH_SECRET` rather than kept in .env: nothing new to generate or ask for on a deploy. Rotating that
// secret changes the pair; each browser's subscription then fails once and is subscribed again on its next visit
// (`src/hooks/use-push.ts` compares the key it was made with).

export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

let keys: VapidKeys | undefined;

/** The server's VAPID key pair, as web-push wants it (base64url), and the contact push services see. */
export function vapidKeys(): VapidKeys {
  if (keys) return keys;
  // 32 bytes from the secret are a P-256 private key, unless (with odds of about 2^-32) they exceed the curve's order;
  // the counter then tries the next ones.
  for (let attempt = 0; ; attempt += 1) {
    const secret = Buffer.from(
      hkdfSync("sha256", env.BETTER_AUTH_SECRET, "tofang", `vapid-p256-${attempt}`, 32) as ArrayBuffer,
    );
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(secret);
      const origin = new URL(env.BETTER_AUTH_URL);
      keys = {
        publicKey: ecdh.getPublicKey().toString("base64url"),
        privateKey: secret.toString("base64url"),
        // Push services want an https: page or a mailto: address; a development origin is plain http.
        subject: origin.protocol === "https:" ? origin.origin : `mailto:push@${origin.hostname}`,
      };
      return keys;
    } catch {
      // Not a valid key: try the next derivation.
    }
  }
}

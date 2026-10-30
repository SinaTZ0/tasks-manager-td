import { eq } from "drizzle-orm";

import { db } from "#/db/client.server";
import { user } from "#/db/schema";
import { auth } from "#/lib/auth.server";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "#/orpc/team/constants";

/*===== Seed =====*/
// Creates an admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (and SEED_ADMIN_NAME, "Admin" when unset). Idempotent:
// an existing account with that email is only promoted, never changed otherwise. Run with `pnpm db:seed` after
// `pnpm db:migrate`; on a server, `deploy/deploy.sh admin <email>` runs the bundled copy (`deploy/seed-admin.mjs`) for
// an email no account has yet, since there is no public sign-up to make one.

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin";

if (!email || !password) {
  throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to seed the admin.");
}

/*------ Account ------*/
// Through the internal adapter: public sign-up is disabled (`auth.server.ts`). The adapter skips Better-Auth's password
// checks, so the team form's limits are applied here: sign-in would refuse a password outside them.
const context = await auth.$context;
const existing = await context.internalAdapter.findUserByEmail(email);

if (!existing) {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`The password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`);
  }
  const created = await context.internalAdapter.createUser({ email, name, emailVerified: true }, { method: "admin" });
  await context.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: await context.password.hash(password),
  });
}

/*------ Role ------*/
await db.update(user).set({ role: "admin" }).where(eq(user.email, email));

console.info(existing ? `Promoted ${email} to admin.` : `Created admin ${email}.`);
await db.$client.end();

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { sql } from "drizzle-orm";

import { db } from "#/db/client.server";
import { env } from "#/env.server";

/*===== Reset =====*/
// Before launch there are no migrations (CLAUDE.md → Before Launch): the local database is rebuilt from the schema
// whenever it changes. `pnpm db:reset` drops everything, pushes `schema.ts` with `drizzle-kit push --force`, adds the
// SQL a push can't express (`activity-append-only.sql`), and seeds the admin (`pnpm db:seed`). Local databases only.

const url = new URL(env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  throw new Error(`Refusing to reset ${url.hostname}: only a local database is reset.`);
}

/*------ Wipe ------*/
await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
await db.execute(sql`DROP SCHEMA public CASCADE`);
await db.execute(sql`CREATE SCHEMA public`);

/*------ Schema ------*/
execFileSync("pnpm", ["exec", "drizzle-kit", "push", "--force"], { stdio: "inherit" });

/*------ Hand-Written SQL ------*/
// The file is split the way drizzle splits a migration, so it can become the end of the first one at launch.
const statements = readFileSync(new URL("./activity-append-only.sql", import.meta.url), "utf8").split(
  "--> statement-breakpoint",
);
for (const statement of statements) {
  if (statement.trim()) await db.execute(sql.raw(statement));
}
await db.$client.end();

/*------ Admin ------*/
execFileSync("pnpm", ["db:seed"], { stdio: "inherit" });
console.log("Local database reset.");

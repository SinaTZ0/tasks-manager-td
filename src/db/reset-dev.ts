import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "#/db/client.server";
import { env } from "#/env.server";

/*===== Reset =====*/
// The demo's data doesn't matter (CLAUDE.md → Demo), so the local database is wiped whenever that helps.
// `pnpm db:reset` drops everything, applies every migration in `drizzle/` with the migrator the server's `migrate` job
// uses (`deploy/migrate.mjs`), and seeds the admin (`pnpm db:seed`). Local databases only.

const url = new URL(env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  throw new Error(`Refusing to reset ${url.hostname}: only a local database is reset.`);
}

/*------ Wipe ------*/
await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
await db.execute(sql`DROP SCHEMA public CASCADE`);
await db.execute(sql`CREATE SCHEMA public`);

/*------ Migrations ------*/
await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) });
await db.$client.end();

/*------ Admin ------*/
execFileSync("pnpm", ["db:seed"], { stdio: "inherit" });
console.log("Local database reset.");

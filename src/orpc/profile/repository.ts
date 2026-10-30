import { eq } from "drizzle-orm";

import type { Database } from "#/db/client.server";
import { user } from "#/db/schema";

/*===== Types =====*/
export type ProfileRow = { id: string; name: string; email: string; avatarMediaId: string | null };

const columns = { id: user.id, name: user.name, email: user.email, avatarMediaId: user.avatarMediaId };

/*===== Reads =====*/
/** A person's profile, locked until the transaction ends when `lock` is set, so two saves take turns. */
export async function findProfile({
  db,
  userId,
  lock = false,
}: {
  db: Database;
  userId: string;
  lock?: boolean;
}): Promise<ProfileRow | undefined> {
  const query = db.select(columns).from(user).where(eq(user.id, userId)).limit(1);
  const [row] = lock ? await query.for("update") : await query;
  return row;
}

/*===== Writes =====*/
export async function updateProfileRow({
  db,
  userId,
  values,
}: {
  db: Database;
  userId: string;
  values: { name: string; avatarMediaId: string | null };
}): Promise<ProfileRow> {
  const [row] = await db.update(user).set(values).where(eq(user.id, userId)).returning(columns);
  if (!row) throw new Error("updateProfileRow: no row");
  return row;
}

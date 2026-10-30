import type { Database } from "#/db/client.server";
import { issuesToErrorData } from "#/lib/schema-issues";
import { recordActivity } from "#/orpc/activity/service";
import { toPublicMedia } from "#/orpc/media/mapper";
import { findMediaById } from "#/orpc/media/repository";
import { attachMedia, discardMedia, releaseMedia } from "#/orpc/media/service";
import type { Profile } from "#/orpc/profile/contract";
import { findProfile, updateProfileRow, type ProfileRow } from "#/orpc/profile/repository";
import { profileChangeSchema } from "#/orpc/profile/validation";
import { m } from "#/paraglide/messages";

/*===== Shape =====*/
async function toProfile({ db, row }: { db: Database; row: ProfileRow }): Promise<Profile> {
  const media = row.avatarMediaId ? await findMediaById({ db, id: row.avatarMediaId }) : undefined;
  return { id: row.id, name: row.name, email: row.email, avatar: media ? toPublicMedia(media) : null };
}

/*===== Get =====*/
export async function getProfile({ db, userId }: { db: Database; userId: string }): Promise<Profile> {
  const row = await findProfile({ db, userId });
  if (!row) throw new Error("getProfile: the signed-in user has no row");
  return toProfile({ db, row });
}

/*===== Update =====*/
type UpdateResult = { kind: "success"; profile: Profile } | { kind: "invalid"; fields: Record<string, string> };

/**
 * Changes the person's own name and picture. A new picture must be an `avatar` they uploaded in the last day
 * (`attachMedia`); the one it replaces is released in the same transaction and deleted once it commits
 * (docs/backend/media.md). A new name shows everywhere at once, since pages read names from the user row; old history
 * entries keep the name they were written with.
 *
 * @returns `invalid` with field messages for a bad name or a picture that can't be used.
 */
export async function updateProfile({
  db,
  userId,
  input,
}: {
  db: Database;
  userId: string;
  input: unknown;
}): Promise<UpdateResult> {
  const parsed = profileChangeSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  const { name, avatarMediaId } = parsed.data;

  const result = await db.transaction(async (tx) => {
    const current = await findProfile({ db: tx, userId, lock: true });
    if (!current) throw new Error("updateProfile: the signed-in user has no row");

    /*------ Picture ------*/
    const replaced = current.avatarMediaId !== avatarMediaId ? current.avatarMediaId : null;
    if (avatarMediaId && avatarMediaId !== current.avatarMediaId) {
      const attached = await attachMedia({ db: tx, mediaId: avatarMediaId, kind: "avatar", userId });
      if (attached.kind === "invalid") {
        return { kind: "invalid" as const, fields: { avatarMediaId: m.profile_error_avatar_unusable() } };
      }
    }
    if (replaced) await releaseMedia({ db: tx, mediaId: replaced });

    /*------ Row ------*/
    const row = await updateProfileRow({ db: tx, userId, values: { name, avatarMediaId } });
    if (current.name !== name || replaced || avatarMediaId !== current.avatarMediaId) {
      await recordActivity({
        db: tx,
        actorId: userId,
        entries: [
          {
            action: "user.profile_updated",
            before: { name: current.name, avatar: current.avatarMediaId !== null },
            after: { name, avatar: avatarMediaId !== null },
            snapshot: { userId, name, email: current.email },
          },
        ],
      });
    }
    return { kind: "success" as const, row, replaced };
  });
  if (result.kind === "invalid") return result;

  if (result.replaced) await discardMedia({ db, mediaId: result.replaced });
  return { kind: "success", profile: await toProfile({ db, row: result.row }) };
}

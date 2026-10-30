import type { Database } from "#/db/client.server";
import { auth, revokeUserSessions } from "#/lib/auth.server";
import type { UserRole, UserStatus } from "#/lib/user-constants";
import { issuesToErrorData } from "#/lib/schema-issues";
import { recordActivity } from "#/orpc/activity/service";
import type { TeamMember } from "#/orpc/team/contract";
import { toTeamMember } from "#/orpc/team/mapper";
import {
  countOpenTasks,
  findAllUsers,
  findUserByEmail,
  findUserById,
  insertUserWithPassword,
  lockOtherActiveAdmins,
  updateUser,
} from "#/orpc/team/repository";
import { newMemberSchema } from "#/orpc/team/validation";
import { m } from "#/paraglide/messages";

/*===== List =====*/
export async function listTeam({ db }: { db: Database }): Promise<TeamMember[]> {
  const rows = await findAllUsers({ db });
  const open = await countOpenTasks({ db, userIds: rows.map((row) => row.id) });
  return rows.map((record) => toTeamMember({ record, openTasks: open.get(record.id) ?? 0 }));
}

/*===== Add =====*/
type AddMemberResult = { kind: "success"; member: TeamMember } | { kind: "invalid"; fields: Record<string, string> };

/**
 * Creates an account for a new teammate (there is no public sign-up). They sign in with the password the admin set;
 * the account is active and needs no e-mail verification, since an admin vouched for it.
 *
 * @returns `invalid` with field messages for a bad value or an e-mail another account uses.
 */
export async function addMember({
  db,
  actorId,
  input,
}: {
  db: Database;
  actorId: string;
  input: unknown;
}): Promise<AddMemberResult> {
  const parsed = newMemberSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", fields: issuesToErrorData(parsed.error.issues).fields };
  const { name, email, password, role } = parsed.data;

  if (await findUserByEmail({ db, email })) {
    return { kind: "invalid", fields: { email: m.team_error_email_taken() } };
  }

  // Hashed with Better-Auth's own settings, so sign-in verifies it.
  const passwordHash = await (await auth.$context).password.hash(password);

  return db.transaction(async (tx): Promise<AddMemberResult> => {
    const record = await insertUserWithPassword({
      db: tx,
      values: { id: crypto.randomUUID(), name, email, emailVerified: true, role, status: "active" },
      passwordHash,
    });
    await recordActivity({
      db: tx,
      actorId,
      entries: [{ action: "user.created", after: { role }, snapshot: { userId: record.id, name, email } }],
    });
    return { kind: "success", member: toTeamMember({ record, openTasks: 0 }) };
  });
}

/*===== Role and Status =====*/
type ChangeResult =
  { kind: "success"; member: TeamMember } | { kind: "not-found" } | { kind: "conflict"; message: string };

/**
 * Changes a teammate's role or status. Nobody changes their own, and the last active admin can't be demoted or
 * deactivated, so the team always keeps someone who can manage it. A deactivated account is signed out everywhere.
 * Someone made a viewer keeps the tasks assigned to them; the team page shows how many, so an admin can hand them on.
 *
 * @returns `conflict` with the reason for a change to one's own account or one that leaves no active admin.
 */
export async function changeMember({
  db,
  actorId,
  userId,
  change,
}: {
  db: Database;
  actorId: string;
  userId: string;
  change: { role: UserRole } | { status: UserStatus };
}): Promise<ChangeResult> {
  if (userId === actorId) return { kind: "conflict", message: m.team_error_self() };

  const result = await db.transaction(async (tx): Promise<ChangeResult> => {
    const current = await findUserById({ db: tx, id: userId });
    if (!current) return { kind: "not-found" };

    const losesAdmin =
      current.role === "admin" &&
      current.status === "active" &&
      ("role" in change ? change.role !== "admin" : change.status !== "active");
    if (losesAdmin && (await lockOtherActiveAdmins({ db: tx, exceptId: userId })).length === 0) {
      return { kind: "conflict", message: m.team_error_last_admin() };
    }

    const field = "role" in change ? "role" : "status";
    const before = current[field];
    const next = "role" in change ? change.role : change.status;
    const openTasks = (await countOpenTasks({ db: tx, userIds: [userId] })).get(userId) ?? 0;
    if (before === next) return { kind: "success", member: toTeamMember({ record: current, openTasks }) };

    const record = await updateUser({ db: tx, id: userId, values: change });
    await recordActivity({
      db: tx,
      actorId,
      entries: [
        {
          action: field === "role" ? "user.role_changed" : "user.status_changed",
          before: { [field]: before },
          after: { [field]: next },
          snapshot: { userId, name: current.name, email: current.email },
        },
      ],
    });
    return { kind: "success", member: toTeamMember({ record, openTasks }) };
  });

  // After the commit: a blocked account's open sessions would otherwise keep working until they expire.
  if (result.kind === "success" && "status" in change && change.status === "blocked") {
    await revokeUserSessions(userId);
  }
  return result;
}

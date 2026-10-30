/*===== User Constants =====*/
// Browser-safe values shared by auth, the seed and the route guards. Stored as plain text (see `src/db/schema.ts`), so
// adding a role is a code change, not a migration.

/**
 * `admin` manages the team and its projects and is the only one who creates or archives tasks; `user` works on the
 * tasks of their projects; `viewer` only reads them (and can still be @mentioned). Only ever set on the server (the
 * seed, or the team page).
 */
export const USER_ROLES = ["admin", "user", "viewer"] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** The roles that change a project's work: everyone but a viewer. */
export const EDITOR_ROLES = ["admin", "user"] as const satisfies readonly UserRole[];

/**
 * Whether someone may change a project's tasks (move, edit, comment, track time…), or take one on as owner, assignee
 * or delegate. An unknown role reads as read-only.
 */
export function canEdit(role: string | null | undefined): boolean {
  return (EDITOR_ROLES as readonly string[]).includes(role ?? "");
}

/** Blocked users can't use the API, and their sessions are revoked when a guarded page sees them. */
export const USER_STATUSES = ["active", "blocked"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

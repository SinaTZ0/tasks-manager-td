import type { UserRole } from "#/lib/user-constants";
import { m } from "#/paraglide/messages";

/*===== Role Labels =====*/
// Message functions, not their text, so each request gets its own locale.
const ROLE_LABELS: Record<UserRole, () => string> = {
  admin: m.team_role_admin,
  user: m.team_role_user,
  viewer: m.team_role_viewer,
};

/** What each role may do, one line under the picker. */
const ROLE_HINTS: Record<UserRole, () => string> = {
  admin: m.team_role_admin_hint,
  user: m.team_role_user_hint,
  viewer: m.team_role_viewer_hint,
};

/** The line saying what a role may do, in the reader's language. */
export function roleHint(role: UserRole): string {
  return ROLE_HINTS[role]();
}

/** The roles as select items, labelled in the reader's language. */
export function roleItems(): { value: UserRole; label: string; hint: string }[] {
  return (Object.keys(ROLE_LABELS) as UserRole[]).map((value) => ({
    value,
    label: ROLE_LABELS[value](),
    hint: ROLE_HINTS[value](),
  }));
}

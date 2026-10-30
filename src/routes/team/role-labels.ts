import type { UserRole } from "#/lib/user-constants";
import { m } from "#/paraglide/messages";

/*===== Role Labels =====*/
// Message functions, not their text, so each request gets its own locale.
const ROLE_LABELS: Record<UserRole, () => string> = {
  user: m.team_role_user,
  admin: m.team_role_admin,
};

/** The roles as select items, labelled in the reader's language. */
export function roleItems(): { value: UserRole; label: string }[] {
  return (Object.keys(ROLE_LABELS) as UserRole[]).map((value) => ({ value, label: ROLE_LABELS[value]() }));
}

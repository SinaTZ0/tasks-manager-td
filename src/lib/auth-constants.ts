/*===== Auth Constants =====*/
// Browser-safe values shared by the auth server (`auth.server.ts`), the admin's user form and the sign-in page.

/** The longest display name, after normalization. The forms and the server all check it. */
export const NAME_MAX_LENGTH = 60;

/** Error code returned by the sign-in hook for a blocked account. */
export const ACCOUNT_BLOCKED_CODE = "ACCOUNT_BLOCKED";

/** Error codes returned by the update-user hook for a display name that is empty or too long. */
export const NAME_REQUIRED_CODE = "NAME_REQUIRED";
export const NAME_TOO_LONG_CODE = "NAME_TOO_LONG";

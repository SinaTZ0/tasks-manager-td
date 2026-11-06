import { baseLocale, type Locale } from "#/paraglide/runtime";

/*===== Card Path =====*/

/**
 * A card's path on its board, for what leaves the router: a push message, or a link the desktop widget opens in the
 * browser. The base locale's paths have no prefix (`/projects/…`), the others theirs (`/en/projects/…`).
 */
export function cardPath({
  locale,
  projectKey,
  taskCode,
}: {
  locale: Locale;
  projectKey: string;
  taskCode: string;
}): string {
  const prefix = locale === baseLocale ? "" : `/${locale}`;
  const search = new URLSearchParams({ task: taskCode });
  return `${prefix}/projects/${encodeURIComponent(projectKey)}?${search}`;
}

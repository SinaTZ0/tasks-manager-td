import { existsSync, readdirSync } from "node:fs";

import { index, layout, rootRoute, route } from "@tanstack/virtual-file-routes";

/*===== Design Studies =====*/

const STUDIES = `${import.meta.dirname}/routes/design_study`;

/**
 * A design study is a gitignored slice, `design_study/<topic>/design-study-<topic>.tsx`, served at
 * `/design-study/<topic>` (the `design-study` skill). They are found on disk, so a checkout has only the studies it
 * holds: the server has none, and deleting a study's folder removes its route once the dev server restarts. The one
 * nested folder under `src/routes/`, because Tailwind can only reach a gitignored folder by its literal path.
 */
const designStudies = () =>
  existsSync(STUDIES)
    ? readdirSync(STUDIES).map((folder) => {
        const topic = folder.replaceAll("_", "-");
        return route(`/design-study/${topic}`, `design_study/${folder}/design-study-${topic}.tsx`);
      })
    : [];

/*===== Routes =====*/

// The route tree, declared in code so route slices stay flat folders under `src/routes/` (CLAUDE.md → Route Slices).
// File paths are relative to `src/routes/`. The TanStack Start plugin turns this into `src/routeTree.gen.ts`.
export const routes = rootRoute("__root.tsx", [
  layout("site_layout/site-layout.tsx", [
    route("/auth", "auth/auth.tsx"),
    layout("app_layout/app-layout.tsx", [
      index("home/home.tsx"),
      route("/my-tasks", "my_tasks/my-tasks.tsx"),
      route("/search", "search/search.tsx"),
      route("/notes", "notes/notes.tsx"),
      route("/delegated", "delegated/delegated.tsx"),
      route("/profile", "profile/profile.tsx"),
      route("/projects/$projectKey", "projects_projectKey/projects-project-key.tsx"),
      route("/projects/$projectKey/activity", "projects_projectKey_activity/projects-project-key-activity.tsx"),
      route("/projects/$projectKey/archive", "projects_projectKey_archive/projects-project-key-archive.tsx"),
      route("/projects/$projectKey/calendar", "projects_projectKey_calendar/projects-project-key-calendar.tsx"),
      ...designStudies(),
      layout("admin_layout/admin-layout.tsx", [
        route("/team", "team/team.tsx"),
        route("/projects/$projectKey/settings", "projects_projectKey_settings/projects-project-key-settings.tsx"),
      ]),
    ]),
  ]),

  /*===== Server Routes =====*/
  // No component: each answers HTTP requests itself (`server.handlers`).
  route("/api/auth/$", "api_auth/api-auth.ts"),
  route("/rpc/$", "rpc/rpc.ts"),
  route("/healthz", "healthz/healthz.ts"),
  route("/robots.txt", "robots/robots.ts"),
  route("/sitemap.xml", "sitemap/sitemap.ts"),
]);

import { index, layout, rootRoute, route } from "@tanstack/virtual-file-routes";

// The route tree, declared in code so route slices stay flat folders under `src/routes/` (CLAUDE.md → Route Slices).
// File paths are relative to `src/routes/`. The TanStack Start plugin turns this into `src/routeTree.gen.ts`.
export const routes = rootRoute("__root.tsx", [
  layout("site_layout/site-layout.tsx", [
    route("/auth", "auth/auth.tsx"),
    layout("app_layout/app-layout.tsx", [
      index("home/home.tsx"),
      route("/notes", "notes/notes.tsx"),
      route("/delegated", "delegated/delegated.tsx"),
      route("/profile", "profile/profile.tsx"),
      route("/projects/$projectKey", "projects_projectKey/projects-project-key.tsx"),
      route("/projects/$projectKey/activity", "projects_projectKey_activity/projects-project-key-activity.tsx"),
      route("/projects/$projectKey/archive", "projects_projectKey_archive/projects-project-key-archive.tsx"),
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

# Tofang (تفنگ)

The team's task manager: a kanban board for five people, with time tracking (start, pause, stop), dependencies,
delegation, comments and a full history of every change. Persian first (right-to-left), with English.

- **What it does**: [docs/app.md](docs/app.md), the product spec: entities, features by phase, business rules,
  screens and open questions.
- **How it looks**: a hardware instrument in the spirit of the Teenage Engineering EP–133: keycaps seated in
  machined cuts, square LEDs, dark display glass, one orange key per view
  ([docs/frontend/app-identity.md](docs/frontend/app-identity.md)). Browse the parts with `pnpm storybook`.
- **How it's built**: started from [template-start](https://github.com/SinaTZ0/template-start). TanStack Start,
  contract-first oRPC, Drizzle + Postgres, Better-Auth, Paraglide JS, Tailwind v4 and Base UI primitives. Agents start
  at [CLAUDE.md](CLAUDE.md).

## Getting Started

Requirements: Node 26 (`nvm use`, from `.nvmrc`), pnpm, Docker (for the dev services), Go 1.26+ (for the error viewer).

```bash
pnpm install
cp .env.example .env          # then set the two secrets
pnpm services                 # Postgres on 5432, SeaweedFS (S3) on 8333, media bucket
pnpm db:migrate               # create the tables
pnpm db:seed                  # optional: the admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
pnpm db:seed:notes            # optional: sample notes for that admin
pnpm dev                      # http://localhost:3000
pnpm errors                   # optional, in a second terminal: error viewer on http://localhost:8000
```

Generate the secrets with `openssl rand -base64 32`. `pnpm install` also installs the git hooks: staged files are
linted and formatted before each commit, and commit messages must follow
[Conventional Commits](https://www.conventionalcommits.org) (`feat: add note search`, `fix(auth): …`).

## Scripts

| Script                            | What it does                                     |
| --------------------------------- | ------------------------------------------------ |
| `pnpm dev` / `build` / `start`    | Dev server, production build, production server  |
| `pnpm lint` / `typecheck`         | oxlint; message compile + tsc                    |
| `pnpm lint:tw`                    | Lists non-canonical Tailwind classes (advisory)  |
| `pnpm i18n:compile`               | Compiles `messages/` into `src/paraglide/`       |
| `pnpm format`                     | Prettier (sorts Tailwind classes)                |
| `pnpm test`                       | Vitest (integration tests need the database)     |
| `pnpm test:e2e`                   | Playwright against the production build          |
| `pnpm storybook`                  | Component previews on port 6006                  |
| `pnpm db:generate` / `db:migrate` | Record a schema change as a migration; apply it  |
| `pnpm services`                   | Starts `compose.dev.yaml` and creates the bucket |
| `pnpm errors`                     | The error viewer on port 8000, with `go run`     |

## Layout

```text
src/
  routes.ts, styles.css            virtual route config (set in tsr.config.json), theme tokens
  router.tsx, server.ts, client.tsx  router + QueryClient, server entry (tracing, logs), browser entry
  routes/__root.tsx                root route: document shell, global providers
  routes/<slice>/                  one flat folder per route (docs/frontend/architecture.md)
  components/primitive/            this app's shadcn components (docs/frontend/components.md)
  components/shared/               app-made components used by several routes
  components/ui/                   untouched shadcn source, reference only
  orpc/                            the API, one folder per feature (docs/backend/architecture.md)
  lib/                             auth, viewer query, storage, logger, helpers
  db/                              Drizzle schema, client, seed
  paraglide/                       generated message functions (gitignored, docs/frontend/i18n.md)
messages/, project.inlang/         the text per locale; Paraglide settings and config
drizzle/                           SQL migrations (generated, committed)
deploy/                            deploy.sh (the deploy tool's binary in bin/), Caddyfile, production jobs, steps/
tools/deploy/, tools/error-viewer/ the deploy tool's Go source (docs/deployment.md), the error viewer
docs/                              start at backend-flow.md or frontend-flow.md
```

## Status

- Done: the template is set up and renamed; the design system is in place (tokens in `src/styles.css`, the
  instrument recipe, restyled and new primitives with stories); docs filled in (app-identity, components, the product
  spec, the design reference).
- Next: the header, footer, home and sign-in pages in the new look (`docs/customize-template.md` lists the open
  steps), then the first feature (boards and tasks) by copying the shape of the `note` example, which is deleted
  once tasks exist.
- Before the first deploy: replace `drizzle/` with one fresh migration (`pnpm db:generate --name init`), and go
  through "Before Going Live" in `docs/deployment.md`.

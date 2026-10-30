import { ORPCError, os } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "#/db/client.server";
import { project, projectMember } from "#/db/schema";

/*===== Require Project Member =====*/
const notFound = () => new ORPCError("NOT_FOUND", { message: "Not found.", data: { errors: [], fields: {} } });

/**
 * Lets a procedure whose input names a project (`{ projectId }`) run only for that project's members, and for admins,
 * who see every project. Apply it after `requireUserMiddleware` and `provideDbMiddleware`. The procedure's own queries
 * still filter by `projectId`, so a task or label from another project looks missing too.
 *
 * @throws `NOT_FOUND` (see `project-access.errors.ts`) for a project that doesn't exist or that the user isn't on, so
 * the answer never tells which.
 */
export const requireProjectMemberMiddleware = os
  .$context<{ user: { id: string; role?: string | null | undefined }; db: Database }>()
  .middleware(async ({ context, next }, input: { projectId: string }) => {
    // A malformed UUID would make Postgres throw.
    if (!z.guid().safeParse(input.projectId).success) throw notFound();

    const [row] =
      context.user.role === "admin"
        ? await context.db.select({ id: project.id }).from(project).where(eq(project.id, input.projectId)).limit(1)
        : await context.db
            .select({ id: projectMember.projectId })
            .from(projectMember)
            .where(and(eq(projectMember.projectId, input.projectId), eq(projectMember.userId, context.user.id)))
            .limit(1);
    if (!row) throw notFound();

    return next();
  });

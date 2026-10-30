import { ORPCError } from "@orpc/client";
import { notFound } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "#/orpc/client";
import type { Project } from "#/orpc/project/contract";

/*===== Queries =====*/
/** The project's query, by its key as the URL has it (any case: the server matches capitals). */
export const projectQuery = (projectKey: string) => orpc.project.get.queryOptions({ input: { key: projectKey } });

/** The project's live tasks, labels and the people its cards name. */
export const boardQuery = (projectId: string) => orpc.task.board.queryOptions({ input: { projectId } });

/** One task's details, for its drawer. */
export const taskQuery = ({ projectId, number }: { projectId: string; number: number }) =>
  orpc.task.get.queryOptions({ input: { projectId, number } });

/** One task's time logs and the columns it has been in, for its drawer. */
export const timeQuery = ({ projectId, number }: { projectId: string; number: number }) =>
  orpc.time.forTask.queryOptions({ input: { projectId, number } });

/**
 * Loads a project into the cache for a route's loader. A project the viewer can't open answers `NOT_FOUND`, the same
 * as a missing one, and becomes the router's not-found page.
 */
export async function ensureProject({
  queryClient,
  projectKey,
}: {
  queryClient: QueryClient;
  projectKey: string;
}): Promise<Project> {
  try {
    return await queryClient.ensureQueryData(projectQuery(projectKey));
  } catch (error) {
    if (error instanceof ORPCError && error.code === "NOT_FOUND") throw notFound();
    throw error;
  }
}

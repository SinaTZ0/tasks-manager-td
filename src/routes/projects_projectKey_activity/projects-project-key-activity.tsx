import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { HistoryIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import { Card, CardContent } from "#/components/primitive/card/card";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { ActivityFeed } from "#/components/shared/activity-feed/activity-feed";
import { PageHead } from "#/components/shared/page-head/page-head";
import { FormAlert } from "#/components/shared/form-alert/form-alert";
import { pageMeta } from "#/lib/seo";
import { orpc } from "#/orpc/client";
import type { Person } from "#/orpc/project/contract";
import { m } from "#/paraglide/messages";
import { useBoardAccess } from "#/routes/projects_projectKey/access";
import { ProjectPages } from "#/routes/projects_projectKey/components/project-pages";
import { ensureProject, projectQuery } from "#/routes/projects_projectKey/queries";

/*===== Queries =====*/
/**
 * The project's history, a page at a time, newest first. Each page's `nextCursor` is the next page's `before`; the
 * first page has none.
 */
const activityQuery = (projectId: string) =>
  orpc.activity.forProject.infiniteOptions({
    input: (before: Date | undefined) => ({ projectId, before }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    // Others' changes land here all day, so it goes stale sooner than the 5-minute default.
    staleTime: 30_000,
  });

/*===== Route =====*/
export const Route = createFileRoute("/_site-layout/_app-layout/projects/$projectKey/activity")({
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const project = await ensureProject({ queryClient, projectKey: params.projectKey });
    await queryClient.ensureInfiniteQueryData(activityQuery(project.id));
    // Returned as well as cached: `head` needs the name.
    return project;
  },
  head: (args) => pageMeta({ args, title: m.activity_heading({ project: args.loaderData?.name ?? "" }), index: false }),
  component: ActivityPage,
});

/*===== Page =====*/

/**
 * A project's history (docs/app.md rule 7): every change to it and its tasks, newest first, each linking to its card.
 * Older entries come a page at a time.
 */
function ActivityPage() {
  const { projectKey } = Route.useParams();
  const { isAdmin } = useBoardAccess();
  const { data: project } = useSuspenseQuery(projectQuery(projectKey));
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } = useSuspenseInfiniteQuery(
    activityQuery(project.id),
  );

  // Entries name owners and assignees by id. Someone who has left the project reads as "someone".
  const people = new Map<string, Person>(project.members.map((person) => [person.id, person]));
  const items = data.pages.flatMap((page) => page.items);

  return (
    <div className="mx-auto flex w-full max-w-site flex-col gap-6 px-6 py-8">
      {/*------ Header ------*/}
      <PageHead
        code={project.key}
        kicker={project.name}
        title={m.activity_link()}
        description={m.activity_description()}
        actions={<ProjectPages projectKey={project.key} isAdmin={isAdmin} />}
      />

      {/*------ Feed ------*/}
      <Card>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-chassis border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
              <HistoryIcon className="size-8" />
              <p>{m.activity_empty()}</p>
            </div>
          ) : (
            <ActivityFeed items={items} people={people} showTask projectKey={project.key} />
          )}
        </CardContent>
      </Card>

      {/*------ Older Pages ------*/}
      <FormAlert message={isFetchNextPageError ? m.activity_load_failed() : undefined} />
      {hasNextPage && (
        <Button
          variant="secondary"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage && <Spinner data-icon="inline-start" />}
          {m.activity_load_more()}
        </Button>
      )}
    </div>
  );
}

import { createFileRoute, notFound } from "@tanstack/react-router";

import { NotFoundPage } from "#/components/shared/not-found-page/not-found-page";

/*===== Route =====*/

/**
 * Catches every address no other route claims, so an unknown path still gets the site layout: a not-found raised with
 * no route matched would be drawn by the root, outside the header. It throws rather than renders, so the
 * response is a 404.
 */
export const Route = createFileRoute("/_site-layout/$")({
  loader: () => {
    throw notFound();
  },
  notFoundComponent: NotFoundPage,
});

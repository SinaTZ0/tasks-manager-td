import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { SquareIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import { Display, DisplayValue } from "#/components/primitive/display/display";
import { Led } from "#/components/primitive/led/led";
import { toast } from "#/components/primitive/toast/toast";
import { useNow } from "#/hooks/use-now";
import { describeApiFailure } from "#/lib/api-error";
import { formatClock } from "#/lib/duration";
import { orpc } from "#/orpc/client";
import { taskCode } from "#/orpc/task/constants";
import { m } from "#/paraglide/messages";

/*===== Running Timer =====*/

/**
 * The viewer's running timer, in the header on every page (docs/app.md rule 2: one per person): a small display with a
 * blinking LED, the task's code linking to its card, the time since it started, and a key that stops it. The card stays
 * where it is. Nothing shows while no timer runs. The site layout loads the timer before the page renders.
 */
export function RunningTimer() {
  const queryClient = useQueryClient();
  const { data: timer } = useSuspenseQuery(orpc.time.current.queryOptions());
  const now = useNow();

  const stop = useMutation(
    orpc.time.stop.mutationOptions({
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.time.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
        ]),
      onError: (error) => {
        const failure = describeApiFailure({ error, fallback: m.timer_stop_failed() });
        toast.add({ title: failure.message ?? m.timer_stop_failed(), type: "error" });
      },
    }),
  );

  if (!timer) return null;
  const code = taskCode({ key: timer.projectKey, number: timer.number });
  const seconds = now === null ? null : Math.max(0, (now - timer.startedAt.getTime()) / 1000);

  return (
    <div className="flex items-center gap-2">
      <Display size="inline">
        <Led signal="positive" state="blink" size="sm" />
        <Link
          to="/projects/$projectKey"
          params={{ projectKey: timer.projectKey }}
          search={{ task: code }}
          title={timer.title}
          className="font-mono text-body-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="sr-only">{m.timer_running_on()} </span>
          <bdi dir="ltr">{code}</bdi>
        </Link>
        <DisplayValue>{seconds === null ? "" : formatClock(seconds)}</DisplayValue>
      </Display>
      <Button
        variant="secondary"
        size="icon-sm"
        aria-label={m.timer_stop({ code })}
        disabled={stop.isPending}
        onClick={() => stop.mutate(undefined)}
      >
        <SquareIcon />
      </Button>
    </div>
  );
}

import { useQueryClient, type Query, type QueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

import { client, orpc } from "#/orpc/client";

/*===== Connection State =====*/
// Whether this page holds the live stream open right now. The bell polls only while it doesn't.

const listeners = new Set<() => void>();
let connected = false;

function setConnected(value: boolean) {
  if (connected === value) return;
  connected = value;
  for (const notify of listeners) notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while the live stream is open; always false on the server and while the page hydrates. */
export function useLiveConnected(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => connected,
    () => false,
  );
}

/*===== Refetching =====*/
/** Signals for one project that arrive this close together (one move writes several entries) refetch once. */
const COALESCE_MS = 200;
const RETRY_MAX_MS = 30_000;

/** A query whose input names the project: its board, a task, its comments, time, history. */
const isAboutProject = (projectId: string) => (query: Query) =>
  (query.queryKey[1] as { input?: { projectId?: unknown } } | undefined)?.input?.projectId === projectId;

function refetchProject({ queryClient, projectId }: { queryClient: QueryClient; projectId: string }) {
  return Promise.all([
    queryClient.invalidateQueries({ predicate: isAboutProject(projectId) }),
    // Read by key or across projects, so they can't be told apart by input: the project page, My Tasks, hand-offs,
    // and the header's timer (pausing a task stops everyone's timer on it).
    queryClient.invalidateQueries({ queryKey: orpc.project.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.task.mine.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.delegation.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.time.current.key() }),
  ]);
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
  });

/*===== Live Updates =====*/

/**
 * Holds the live stream open for a signed-in page (docs/task-manager-plan.md → slice 16) and refetches what each event
 * names: a project's queries when something in it changed, the bell when a notification arrived. Only active queries
 * refetch at once; the rest are marked stale. A dropped stream is opened again, waiting longer each time up to
 * `RETRY_MAX_MS`, and its `ready` then refetches everything, since changes made meanwhile were missed.
 */
export function useLiveUpdates(userId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const waiting = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const queueProject = (projectId: string) => {
      waiting.add(projectId);
      flushTimer ??= setTimeout(() => {
        flushTimer = undefined;
        for (const id of waiting) void refetchProject({ queryClient, projectId: id });
        waiting.clear();
      }, COALESCE_MS);
    };

    const run = async () => {
      let opened = false;
      let failures = 0;
      while (!controller.signal.aborted) {
        try {
          const events = await client.live.events(undefined, { signal: controller.signal });
          for await (const event of events) {
            if (event.type === "ready") {
              setConnected(true);
              failures = 0;
              if (opened) void queryClient.invalidateQueries();
              opened = true;
            } else if (event.type === "notification") {
              void queryClient.invalidateQueries({ queryKey: orpc.notification.key() });
            } else {
              queueProject(event.projectId);
            }
          }
        } catch {
          // Closed by the server, the network or a deploy: open it again below.
        }
        setConnected(false);
        await sleep(Math.min(RETRY_MAX_MS, 1000 * 2 ** failures), controller.signal);
        failures += 1;
      }
    };
    void run();

    return () => {
      controller.abort();
      clearTimeout(flushTimer);
      setConnected(false);
    };
    // The query client never changes; it is listed for react-hooks, which can't know that.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [userId, queryClient]);
}

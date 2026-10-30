import { Client } from "pg";

import { env } from "#/env.server";
import { createLogger } from "#/lib/logger.server";
import { LIVE_CHANNEL, type LiveSignal } from "#/orpc/live/publish";

const log = createLogger("live");

/*===== Listener =====*/
// One `LISTEN` connection per app process, shared by every open stream, opened with the first one. If it drops, it is
// opened again after `RECONNECT_MS` and every stream hears `lost`: signals sent meanwhile were missed, so pages refetch.

const RECONNECT_MS = 2000;

type Subscriber = (event: { kind: "signal"; signal: LiveSignal } | { kind: "lost" }) => void;

type State = { client: Client | null; connecting: boolean; subscribers: Set<Subscriber> };

// Vite re-evaluates server modules on every change in development; the state lives on `globalThis` so each edit doesn't
// open another connection.
const STATE = Symbol.for("app.live.listener");
const holder = globalThis as typeof globalThis & { [STATE]?: State };
const state: State = (holder[STATE] ??= { client: null, connecting: false, subscribers: new Set() });

function parse(payload: string | undefined): LiveSignal | null {
  try {
    const value: unknown = JSON.parse(payload ?? "");
    if (typeof value !== "object" || value === null) return null;
    const { kind, id } = value as { kind?: unknown; id?: unknown };
    if ((kind === "project" || kind === "notification") && typeof id === "string") return { kind, id };
    return null;
  } catch {
    return null;
  }
}

async function connect(): Promise<void> {
  if (state.client || state.connecting || state.subscribers.size === 0) return;
  state.connecting = true;
  const client = new Client({ connectionString: env.DATABASE_URL });
  const drop = (reason: unknown) => {
    if (state.client !== client) return;
    log.warn({ err: reason }, "live listener lost its connection");
    state.client = null;
    client.end().catch(() => {});
    for (const subscriber of state.subscribers) subscriber({ kind: "lost" });
    setTimeout(() => void connect(), RECONNECT_MS).unref();
  };
  try {
    client.on("notification", (message) => {
      const signal = message.channel === LIVE_CHANNEL ? parse(message.payload) : null;
      if (!signal) return;
      for (const subscriber of state.subscribers) subscriber({ kind: "signal", signal });
    });
    client.on("error", drop);
    client.on("end", () => drop(new Error("connection ended")));
    await client.connect();
    await client.query(`LISTEN ${LIVE_CHANNEL}`);
    state.client = client;
  } catch (error) {
    log.error({ err: error }, "live listener could not connect");
    client.end().catch(() => {});
    setTimeout(() => void connect(), RECONNECT_MS).unref();
  } finally {
    state.connecting = false;
  }
}

/**
 * Hears every signal (and every lost connection) until `signal` aborts. Signals sent before the connection is up are
 * not heard, which is why a stream starts by telling the page to refetch.
 */
export function listenLive({ onEvent, signal }: { onEvent: Subscriber; signal: AbortSignal }): void {
  if (signal.aborted) return;
  state.subscribers.add(onEvent);
  signal.addEventListener("abort", () => state.subscribers.delete(onEvent), { once: true });
  void connect();
}

/** Resolves once the shared connection listens, for tests that must not miss the first signal. */
export async function whenListening(): Promise<void> {
  for (let tries = 0; tries < 100 && !state.client; tries += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/** Closes the shared connection, so a test run can end. */
export async function stopLiveListener(): Promise<void> {
  const client = state.client;
  state.client = null;
  state.subscribers.clear();
  await client?.end();
}

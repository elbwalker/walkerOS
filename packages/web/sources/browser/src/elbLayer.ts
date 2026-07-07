import type { Elb, Logger } from '@walkeros/core';
import { isString, isObject } from '@walkeros/core';
import { createPushResult } from '@walkeros/collector';
import type { Context } from './types';
import { translateToCoreCollector } from './translation';

/**
 * Controller for the append-only `window.elbLayer` command queue.
 *
 * The layer is never spliced, truncated, or cleared: every pushed entry is
 * appended raw so inspection reflects the page's full input history. Two lanes
 * run over it. `walker *` commands process immediately from controller creation,
 * serialized on a pre-start command chain. Non-command events are recorded but
 * held until `start()`, then replayed from a cursor in original push order. The
 * command chain seeds the post-start chain, so the last pre-start command
 * strictly precedes the first replayed event.
 *
 * A drained boundary is persisted on the array (see DRAIN_MARKER) so a
 * controller adopting an already-populated array (destroy/recreate on the same
 * window) resumes PAST what a prior controller dispatched instead of replaying
 * the whole backlog and double-firing every command and event.
 */
export interface ElbLayerController {
  /** Append an entry to the layer and route it. Returns the processing result. */
  intake(entry: unknown[]): Promise<Elb.PushResult>;
  /** Begin consuming recorded events. Idempotent: a second call is a no-op. */
  start(): void;
  /**
   * Append arbitrary work to the FIFO chain, after everything queued so far.
   * `fn` must not await the controller's own chain: calling `enqueue`/`intake`
   * from inside a chain item and awaiting the result deadlocks (it waits on a
   * promise scheduled behind itself). Pushing new entries mid-dispatch is safe
   * — that appends a link, it does not await one.
   */
  enqueue<T>(fn: () => Promise<T> | T): Promise<T>;
  /** Restore the array's native push and forget internal state. */
  destroy(): void;
}

/**
 * Drained-boundary marker persisted on the layer array. Stored under a
 * non-enumerable Symbol so it never appears in inspection, iteration, or JSON:
 * the array stays append-only and reflects the page's full input history, yet a
 * later controller can read where the lanes already drained. `Symbol.for` keeps
 * the key stable across module instances, matching the window single-instance
 * sentinel convention.
 */
const DRAIN_MARKER = Symbol.for(
  '@walkeros/web-source-browser:elbLayer-drained',
);

interface DrainMarker {
  // Leading entries whose command lane has drained: every `walker *` command at
  // a lower index has already been routed.
  commands: number;
  // Leading entries whose event lane has drained: every non-command event at a
  // lower index has already been replayed.
  events: number;
}

const isDrainMarker = (value: unknown): value is DrainMarker =>
  isObject(value) &&
  typeof value.commands === 'number' &&
  typeof value.events === 'number';

// Return the array's existing marker (the same object, so this controller's
// writes persist on the array) or install a fresh zeroed one. Non-enumerable +
// configurable so it stays invisible to inspection yet re-readable later.
const readOrCreateDrainMarker = (arr: unknown[]): DrainMarker => {
  const existing: unknown = Reflect.get(arr, DRAIN_MARKER);
  if (isDrainMarker(existing)) return existing;
  const fresh: DrainMarker = { commands: 0, events: 0 };
  Object.defineProperty(arr, DRAIN_MARKER, {
    value: fresh,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return fresh;
};

export function createElbLayer(
  context: Context,
  config: { name?: string; window?: Window; logger?: Logger.Instance } = {},
): ElbLayerController {
  const layerName = config.name || 'elbLayer';
  const windowObj = config.window;
  const logger = config.logger;

  const ok = (): Elb.PushResult => createPushResult({ ok: true });

  // Window-less environments (SSR/node) cannot host a layer. Return an inert
  // controller so callers never branch on undefined.
  if (!windowObj) {
    return {
      intake: () => Promise.resolve(ok()),
      start: () => {},
      enqueue: <T>(fn: () => Promise<T> | T) =>
        Promise.resolve().then(() => fn()),
      destroy: () => {},
    };
  }

  // Ensure the named array exists without ever replacing an existing one.
  const existing = Reflect.get(windowObj, layerName);
  let layer: unknown[];
  if (Array.isArray(existing)) {
    layer = existing;
  } else {
    layer = [];
    Reflect.set(windowObj, layerName, layer);
  }

  // Adopt any drained boundary a prior controller left on this array. A fresh
  // array reads {0, 0}, reproducing the original replay-the-whole-backlog-once
  // behavior; a recreated one resumes past what already ran.
  const drain = readOrCreateDrainMarker(layer);
  let started = false;
  let commandCursor = drain.commands;
  let eventCursor = drain.events;
  let cmdTail: Promise<Elb.PushResult> = Promise.resolve(ok());
  let tail: Promise<unknown> = Promise.resolve();

  // Mirror the live cursors onto the array-backed marker so the next controller
  // adopting this array (destroy/recreate) resumes from the current boundary.
  const persistDrain = (): void => {
    drain.commands = commandCursor;
    drain.events = eventCursor;
  };

  const route = (item: unknown): Promise<Elb.PushResult> => {
    if (Array.isArray(item)) {
      const [eventOrCommand, ...rest] = item;
      return translateToCoreCollector(context, eventOrCommand, ...rest);
    }
    return translateToCoreCollector(context, item);
  };

  // One bad entry must not break the chain: isolate each route so a throw
  // resolves ok:false and the FIFO continues.
  const routeSafe = async (item: unknown[]): Promise<Elb.PushResult> => {
    try {
      return await route(item);
    } catch (error) {
      logger?.warn('elbLayer entry failed', { error, item });
      return createPushResult({ ok: false });
    }
  };

  const isCommandEntry = (item: unknown[]): boolean => {
    const first = item[0];
    return isString(first) && first.startsWith('walker ');
  };

  const process = (item: unknown[], index: number): Promise<Elb.PushResult> => {
    if (!started) {
      if (isCommandEntry(item)) {
        // A prior controller on this array already routed commands below the
        // marker boundary — never route them a second time.
        if (index < commandCursor) return Promise.resolve(ok());
        const link = cmdTail.then(() => routeSafe(item));
        cmdTail = link;
        commandCursor = index + 1;
        persistDrain();
        return link;
      }
      // Pre-start event: recorded in the layer, replayed on start().
      return Promise.resolve(ok());
    }
    // Post-start every entry serializes on the shared tail and drains both
    // lanes. A later start() is barred by the started flag, so these are never
    // replayed.
    const link = tail.then(() => routeSafe(item));
    tail = link;
    commandCursor = index + 1;
    eventCursor = index + 1;
    persistDrain();
    return link;
  };

  const appendAndProcess = (raw: unknown): Promise<Elb.PushResult> => {
    const normalized = normalizeItem(raw);
    // Append the raw arg so inspection shows exactly what the page pushed.
    // Index-assign, not layer.push(raw): push here is our own wrappedPush
    // override, so calling it would recurse into this function.
    const index = layer.length;
    layer[index] = raw;
    if (!normalized) return Promise.resolve(ok());
    return process(normalized, index);
  };

  // Live capture: normalize, append raw, route. Returns the array's new length
  // to honor the Array.push contract.
  const wrappedPush = (...args: unknown[]): number => {
    for (const arg of args) appendAndProcess(arg);
    return layer.length;
  };
  layer.push = wrappedPush;

  // Backlog present at creation flows through the same lanes without being
  // re-appended: commands run now via the command chain, events wait for start.
  const backlogLength = layer.length;
  for (let i = 0; i < backlogLength; i++) {
    const normalized = normalizeItem(layer[i]);
    if (normalized) process(normalized, i);
  }

  const intake = (entry: unknown[]): Promise<Elb.PushResult> =>
    appendAndProcess(entry);

  const start = (): void => {
    // Runs at most once (started flag). A second call must not re-seed tail
    // from cmdTail — that would rewind the chain past work enqueued after
    // start and orphan it. The cursor only marks the pre-start backlog boundary.
    if (started) return;
    started = true;
    // Seed the post-start chain from the command chain so the last pre-start
    // command strictly precedes the first replayed event.
    tail = cmdTail;
    for (let i = eventCursor; i < layer.length; i++) {
      const normalized = normalizeItem(layer[i]);
      if (!normalized) continue;
      if (isCommandEntry(normalized)) continue; // already ran pre-start
      const item = normalized;
      tail = tail.then(() => routeSafe(item));
    }
    // Both lanes are now drained up to the current length: every pre-start
    // command ran on intake and every recorded event has been scheduled. Record
    // the boundary so a later controller adopting this array resumes past it.
    eventCursor = layer.length;
    commandCursor = layer.length;
    persistDrain();
  };

  const enqueue = <T>(fn: () => Promise<T> | T): Promise<T> => {
    const link = tail.then(() => fn());
    // A rejected enqueue must not wedge the shared chain: advance tail through a
    // swallow so later enqueues and post-start events still run. The returned
    // link stays rejectable so awaiting callers still observe the rejection.
    tail = link.then(
      () => undefined,
      () => undefined,
    );
    return link;
  };

  const destroy = (): void => {
    // Drop the own-property override so pushes fall back to Array.prototype.push.
    Reflect.deleteProperty(layer, 'push');
    started = false;
    commandCursor = 0;
    eventCursor = 0;
    cmdTail = Promise.resolve(ok());
    tail = Promise.resolve();
    // The array's drained marker is intentionally KEPT: it is the append-only
    // array's memory of what already ran, so a recreate resumes past it.
  };

  return { intake, start, enqueue, destroy };
}

/**
 * Normalize a queue item into an Array (or null if invalid/empty).
 */
function normalizeItem(pushedItem: unknown): unknown[] | null {
  const item = isArguments(pushedItem)
    ? [...Array.from(pushedItem)]
    : isArrayLike(pushedItem)
      ? Array.from(pushedItem as ArrayLike<unknown>)
      : [pushedItem];
  if (!Array.isArray(item) || item.length === 0) return null;
  if (item.length === 1 && !item[0]) return null;
  const firstParam = item[0];
  if (isObject(firstParam) && Object.keys(firstParam as object).length === 0) {
    return null;
  }
  if (
    !isObject(firstParam) &&
    isString(firstParam) &&
    firstParam.trim() === ''
  ) {
    return null;
  }
  return item;
}

/**
 * Check if value is arguments object
 */
function isArguments(value: unknown): value is IArguments {
  return (
    value != null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Arguments]'
  );
}

/**
 * Check if value is array-like (has length property)
 */
function isArrayLike(value: unknown): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    'length' in value &&
    typeof (value as unknown[]).length === 'number'
  );
}

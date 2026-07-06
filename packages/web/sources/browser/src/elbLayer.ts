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

  let started = false;
  let eventCursor = 0;
  let cmdTail: Promise<Elb.PushResult> = Promise.resolve(ok());
  let tail: Promise<unknown> = Promise.resolve();

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

  const process = (item: unknown[]): Promise<Elb.PushResult> => {
    if (!started) {
      if (isCommandEntry(item)) {
        const link = cmdTail.then(() => routeSafe(item));
        cmdTail = link;
        return link;
      }
      // Pre-start event: recorded in the layer, replayed on start().
      return Promise.resolve(ok());
    }
    // Post-start every entry serializes on the shared tail. A later start() is
    // barred by the started flag, so these are never replayed.
    const link = tail.then(() => routeSafe(item));
    tail = link;
    return link;
  };

  const appendAndProcess = (raw: unknown): Promise<Elb.PushResult> => {
    const normalized = normalizeItem(raw);
    // Append the raw arg so inspection shows exactly what the page pushed.
    // Index-assign, not layer.push(raw): push here is our own wrappedPush
    // override, so calling it would recurse into this function.
    layer[layer.length] = raw;
    if (!normalized) return Promise.resolve(ok());
    return process(normalized);
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
    if (normalized) process(normalized);
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
    eventCursor = layer.length;
  };

  const enqueue = <T>(fn: () => Promise<T> | T): Promise<T> => {
    const link = tail.then(() => fn());
    tail = link;
    return link;
  };

  const destroy = (): void => {
    // Drop the own-property override so pushes fall back to Array.prototype.push.
    Reflect.deleteProperty(layer, 'push');
    started = false;
    eventCursor = 0;
    cmdTail = Promise.resolve(ok());
    tail = Promise.resolve();
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

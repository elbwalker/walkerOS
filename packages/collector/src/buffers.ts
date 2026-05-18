import type { Logger } from '@walkeros/core';

/**
 * Bounded-append helpers for collector internal buffers.
 *
 * Three collector buffers are size-bounded:
 *  - `collector.queue` (replay buffer for late-registered destinations)
 *  - `destination.queuePush` (consent-denied buffer, per destination)
 *  - `destination.dlq` (failed-push dead-letter queue, per destination)
 *
 * All three share the same FIFO ring-buffer eviction semantics, so the
 * append logic lives in one place. `pushBounded` performs the size check,
 * evicts oldest entries (or refuses the new one for `dropNewest`), and
 * reports drops back to the caller via the typed result + optional callback.
 *
 * Caller responsibility: increment the appropriate status counter
 * (`status.dropped.queue`, `status.destinations[id].dropped.queuePush`, etc.)
 * and emit the warn-once-on-transition log. The helper stays pure: no logger
 * coupling, no collector reference.
 */

export type BufferOverflowPolicy = 'dropOldest' | 'dropNewest';

export interface BufferBound {
  max: number;
  onOverflow?: BufferOverflowPolicy;
}

export interface PushBoundedResult {
  /** Whether the new item was appended to the buffer. */
  appended: boolean;
  /** Number of items dropped on this call (0 in the happy path). */
  dropped: number;
}

/**
 * Append `item` to `buffer`, respecting `bound.max`. On overflow, evict
 * per `bound.onOverflow` (defaults to `'dropOldest'`).
 *
 * @param buffer - In-place mutated array.
 * @param item - Item to append.
 * @param bound - Cap + overflow policy.
 * @param onDrop - Optional callback receiving the dropped items (oldest
 *   evictions on `dropOldest`, or the rejected new item on `dropNewest`).
 *   Called once per overflow event with all dropped items batched.
 * @returns `{ appended, dropped }`.
 */
export function pushBounded<T>(
  buffer: T[],
  item: T,
  bound: BufferBound,
  onDrop?: (dropped: T[]) => void,
): PushBoundedResult {
  if (!Number.isFinite(bound.max) || bound.max <= 0) {
    throw new Error(`pushBounded: max must be > 0 (got ${bound.max})`);
  }

  const policy: BufferOverflowPolicy = bound.onOverflow ?? 'dropOldest';

  if (policy === 'dropNewest') {
    if (buffer.length >= bound.max) {
      if (onDrop) onDrop([item]);
      return { appended: false, dropped: 1 };
    }
    buffer.push(item);
    return { appended: true, dropped: 0 };
  }

  // dropOldest
  const dropped: T[] = [];
  while (buffer.length >= bound.max) {
    // Length-guarded shift; never undefined here (max > 0, length > 0).
    dropped.push(buffer.shift()!);
  }
  buffer.push(item);
  if (dropped.length > 0 && onDrop) onDrop(dropped);
  return { appended: true, dropped: dropped.length };
}

/**
 * Per-buffer overflow log state. Used to emit a single warn when a buffer
 * crosses from below-cap to at-cap, suppressing further warns until the
 * buffer drains below cap and overflows again (per Q13).
 */
const overflowState = new WeakMap<object, boolean>();

/**
 * Emit a warn-once log on the transition into overflow. Subsequent drops
 * within the same overflow window stay silent until the buffer drains
 * (the caller signals "below-cap again" by calling `resetOverflow`).
 *
 * The cumulative drop counter is still incremented on every drop by the
 * caller, so operators retain rate signal via `collector.status.dropped`.
 */
export function warnOverflowOnce(
  buffer: object,
  logger: Logger.Instance,
  message: string,
  context: Record<string, unknown>,
): void {
  if (overflowState.get(buffer)) return;
  overflowState.set(buffer, true);
  logger.warn(message, context);
}

/**
 * Reset the overflow flag when a buffer drains below cap, so the next
 * overflow transition will warn again.
 */
export function resetOverflowFlag(buffer: object): void {
  overflowState.delete(buffer);
}

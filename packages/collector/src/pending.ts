import type { Collector } from '@walkeros/core';
import { registerDestination } from './destination';
import { isRequireSatisfied } from './on';
import { flushSourceQueueOn, isSourceStarted } from './source';

/**
 * Drive activation of every not-yet-active source or destination whose
 * `require` gate is now fully satisfied by the collector's CURRENT recorded
 * state. This is the load-bearing, order-independent safety net: a step
 * activates from the present state regardless of whether the required type
 * fired before or after the step registered (the level, not the broadcast
 * edge). Runs at four triggers (source registration, every state change, the
 * run barrier, dynamic destination add); each call is idempotent.
 *
 * Guards:
 *  - Additive. A `require` entry is removed IFF `isRequireSatisfied` (a
 *    cell-backed type is present, or an arbitrary type was recorded in
 *    `seenEvents`). The broadcast-decrement path in `onApply` stays fully
 *    intact, so non-state/arbitrary `require` remains broadcast-satisfiable.
 *  - Monotonic + idempotent. A step transitions pending→active exactly once:
 *    started sources and already-registered destinations are excluded from the
 *    worklist, and `flushSourceQueueOn` clears the buffer it drains.
 *  - Delivery-inert while `!allowed`. A source it starts flushes its queueOn,
 *    but `flushSourceQueueOn` defers state deliveries (no `on` call, no
 *    `setMark`) until allowed. An activated destination only seeds `queuePush`;
 *    its `init()`/send stay behind the `!allowed` gate in `pushToDestinations`.
 *
 * Worklist is scoped to not-yet-active steps only (`pending.destinations` plus
 * unstarted sources); the live `collector.destinations`/started sources are
 * never rescanned.
 */
export async function reconcilePending(
  collector: Collector.Instance,
): Promise<void> {
  // Sources: drop satisfied require entries; flush any that transition to
  // started (init done AND require now empty).
  for (const [sourceId, source] of Object.entries(collector.sources)) {
    if (isSourceStarted(source)) continue;
    const require = source.config.require;
    if (!require?.length) continue;

    const remaining = require.filter((t) => !isRequireSatisfied(collector, t));
    if (remaining.length === require.length) continue; // nothing newly satisfied

    source.config.require = remaining;
    if (isSourceStarted(source)) {
      await flushSourceQueueOn(collector, source, sourceId);
    }
  }

  // Destinations: drop satisfied require entries; register + seed queuePush for
  // any whose require fully empties.
  for (const [id, def] of Object.entries(collector.pending.destinations)) {
    if (!collector.pending.destinations[id] || collector.destinations[id])
      continue;

    const require = def.config?.require;
    if (!require) continue;

    const remaining = require.filter((t) => !isRequireSatisfied(collector, t));
    if (def.config) def.config.require = remaining;
    if (remaining.length > 0) continue;

    delete collector.pending.destinations[id];
    const instance = registerDestination(def);
    if (instance.config.queue !== false) {
      instance.queuePush = [...collector.queue];
    }
    collector.destinations[id] = instance;
  }
}

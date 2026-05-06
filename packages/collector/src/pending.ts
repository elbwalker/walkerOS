import type { Collector } from '@walkeros/core';
import { registerDestination } from './destination';

/**
 * Activate pending destinations whose require conditions are met.
 * Called from onApply after each non-vetoed event.
 *
 * Mutates require arrays in place — removes the fulfilled event type.
 * When require is empty, registers and moves to active map.
 *
 * Re-entrancy safe: delete-before-init ensures nested calls see clean state.
 *
 * Sources are no longer pending — their lifecycle is tracked per-instance
 * via `Source.Config.init` and `Source.Instance.queueOn`. See on.ts.
 */
export async function activatePending(
  collector: Collector.Instance,
  type: string,
): Promise<void> {
  for (const [id, def] of Object.entries(collector.pending.destinations)) {
    if (!collector.pending.destinations[id] || collector.destinations[id])
      continue;

    const require = def.config?.require;
    if (!require) continue;

    const idx = require.indexOf(type);
    if (idx === -1) continue;
    require.splice(idx, 1);

    if (require.length > 0) continue;

    delete collector.pending.destinations[id];
    const instance = registerDestination(def);
    if (instance.config.queue !== false) {
      instance.queuePush = [...collector.queue];
    }
    collector.destinations[id] = instance;
  }
}

import type { Collector } from '@walkeros/core';
import { initSource } from './source';
import { registerDestination } from './destination';

/**
 * Activate pending sources and destinations whose require conditions are met.
 * Called from onApply after each non-vetoed event.
 *
 * Mutates require arrays in place — removes the fulfilled event type.
 * When require is empty, initializes and moves to active maps.
 *
 * Re-entrancy safe: delete-before-init ensures nested calls see clean state.
 */
export async function activatePending(
  collector: Collector.Instance,
  type: string,
): Promise<void> {
  for (const [id, def] of Object.entries(collector.pending.sources)) {
    // Re-entrancy guard: skip if already processed by nested call
    if (!collector.pending.sources[id] || collector.sources[id]) continue;

    const require = def.config?.require;
    if (!require) continue;

    const idx = require.indexOf(type);
    if (idx === -1) continue;
    require.splice(idx, 1);

    if (require.length > 0) continue;

    delete collector.pending.sources[id];
    const instance = await initSource(collector, id, def);
    if (instance) collector.sources[id] = instance;
  }

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

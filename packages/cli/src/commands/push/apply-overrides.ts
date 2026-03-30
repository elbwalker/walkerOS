import type { Simulation } from '@walkeros/core';
import { wrapEnv } from '@walkeros/collector';
import type { PushOverrides } from './overrides.js';

/**
 * Result of applying overrides to a collector config.
 */
export interface OverrideResult {
  /** Destination API call tracking references (populated during execution) */
  trackingCalls: Array<{ destId: string; calls: Simulation.Call[] }>;
}

/**
 * Apply push overrides (disabled/mock/simulate) to a collector config object.
 * Mutates config.destinations in place.
 *
 * Returns an OverrideResult with trackingCalls: references to mutable call
 * arrays from wrapEnv, populated when destination code calls tracked env functions.
 *
 * Note: Source simulation capture is handled by overriding collector.push
 * in executeSourceSimulation, not here.
 */
export function applyOverrides(
  config: Record<string, unknown>,
  overrides: PushOverrides,
): OverrideResult {
  const trackingCalls: Array<{ destId: string; calls: Simulation.Call[] }> = [];

  // Destination overrides (existing logic)
  if (overrides.destinations) {
    const destinations = config.destinations as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (destinations) {
      for (const [id, override] of Object.entries(overrides.destinations)) {
        const dest = destinations[id];
        if (!dest) continue;
        if (!dest.config) dest.config = {};
        const destConfig = dest.config as Record<string, unknown>;
        if (override.config?.disabled) destConfig.disabled = true;
        if (override.config?.mock !== undefined)
          destConfig.mock = override.config.mock;
        if (override.env) {
          if (override.simulation && override.simulation.length > 0) {
            // Wrap env with call tracking
            const envWithSim = {
              ...override.env,
              simulation: override.simulation,
            };
            const { wrappedEnv, calls } = wrapEnv(
              envWithSim as Record<string, unknown> & {
                simulation: string[];
              },
            );
            (dest.config as Record<string, unknown>).env = wrappedEnv;
            // Keep reference to mutable calls array — populated during execution
            trackingCalls.push({ destId: id, calls });
          } else {
            (dest.config as Record<string, unknown>).env = override.env;
          }
        }
      }
    }
  }

  // Source simulation: capture is handled by overriding collector.push
  // in executeSourceSimulation, not here. This preserves the source's
  // wrappedPush (and its before chain) while stopping pipeline propagation.

  // Transformer path-specific mocks
  if (overrides.transformerMocks) {
    const transformers = config.transformers as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (transformers) {
      for (const [chainPath, mocks] of Object.entries(
        overrides.transformerMocks,
      )) {
        for (const [transformerId, mockValue] of Object.entries(mocks)) {
          const transformer = transformers[transformerId];
          if (!transformer) continue;
          if (!transformer.config) transformer.config = {};
          const tConfig = transformer.config as Record<string, unknown>;
          if (!tConfig.chainMocks) tConfig.chainMocks = {};
          (tConfig.chainMocks as Record<string, unknown>)[chainPath] =
            mockValue;
        }
      }
    }
  }

  return { trackingCalls };
}

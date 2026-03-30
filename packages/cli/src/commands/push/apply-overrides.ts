import type { Simulation } from '@walkeros/core';
import { wrapEnv } from '@walkeros/collector';
import type { PushOverrides } from './overrides.js';

/**
 * A captured event from a source's env.push during simulation.
 */
export interface CapturedEvent {
  event: unknown;
  timestamp: number;
}

/**
 * Result of applying overrides to a collector config.
 */
export interface OverrideResult {
  /** Source env.push captures (populated during execution) */
  captured: CapturedEvent[];
  /** Destination API call tracking references (populated during execution) */
  trackingCalls: Array<{ destId: string; calls: Simulation.Call[] }>;
}

/**
 * Apply push overrides (disabled/mock/simulate) to a collector config object.
 * Mutates config.destinations and config.sources in place.
 *
 * Returns an OverrideResult with:
 * - captured: mutable array populated when a simulated source calls env.push
 * - trackingCalls: references to mutable call arrays from wrapEnv,
 *   populated when destination code calls tracked env functions
 */
export function applyOverrides(
  config: Record<string, unknown>,
  overrides: PushOverrides,
): OverrideResult {
  const captured: CapturedEvent[] = [];
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

  // Source overrides (new)
  if (overrides.sources) {
    const sources = config.sources as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (sources) {
      for (const [id, override] of Object.entries(overrides.sources)) {
        const source = sources[id];
        if (!source || !override.simulate) continue;
        if (!source.env) source.env = {};
        const env = source.env as Record<string, unknown>;
        const originalPush = env.push as
          | ((...args: unknown[]) => unknown)
          | undefined;
        env.push = (...args: unknown[]) => {
          captured.push({ event: args[0], timestamp: Date.now() });
          if (originalPush) return originalPush(...args);
        };
      }
    }
  }

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

  return { captured, trackingCalls };
}

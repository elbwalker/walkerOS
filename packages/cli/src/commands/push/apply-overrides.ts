import type { PushOverrides } from './overrides.js';

/**
 * Apply push overrides (disabled/mock/env) to a collector config object.
 * Mutates config.destinations and config.transformers in place.
 */
export function applyOverrides(
  config: Record<string, unknown>,
  overrides: PushOverrides,
): void {
  // Destination overrides: disabled, mock, env
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
          destConfig.env = override.env;
        }
      }
    }
  }

  // Both push and simulate need a running collector by default.
  // Collector settings are spread onto the root config (not nested),
  // so `run` is a top-level key when the flow declares collector.run.
  config.run = true;

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
}

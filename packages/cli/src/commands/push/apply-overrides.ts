import type { PushOverrides } from './overrides.js';

/**
 * Apply push overrides (disabled/mock) to a collector config object.
 * Mutates config.destinations in place.
 */
export function applyOverrides(
  config: Record<string, unknown>,
  overrides: PushOverrides,
): void {
  if (!overrides.destinations) return;

  const destinations = config.destinations as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!destinations) return;

  for (const [id, override] of Object.entries(overrides.destinations)) {
    const dest = destinations[id];
    if (!dest) continue;
    if (!dest.config) dest.config = {};
    const destConfig = dest.config as Record<string, unknown>;
    if (override.config?.disabled) destConfig.disabled = true;
    if (override.config?.mock !== undefined)
      destConfig.mock = override.config.mock;
  }
}

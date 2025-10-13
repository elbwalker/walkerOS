import type { Destination } from './types';
import { assign } from './assign';

/**
 * Creates a new destination instance by merging a base destination with additional configuration.
 *
 * This utility enables elegant destination configuration while avoiding config side-effects
 * that could occur when reusing destination objects across multiple collector instances.
 *
 * @param baseDestination - The base destination to extend
 * @param config - Additional configuration to merge with the base destination's config
 * @returns A new destination instance with merged configuration
 *
 * @example
 * ```typescript
 * // Types are inferred automatically from destinationGtag
 * elb('walker destination', createDestination(destinationGtag, {
 *   settings: { ga4: { measurementId: 'G-123' } }
 * }));
 * ```
 */
export function createDestination<I extends Destination.Instance>(
  baseDestination: I,
  config: Partial<Destination.Config<Destination.TypesOf<I>>>,
): I {
  // Create a shallow copy of the base destination to avoid mutations
  const newDestination = { ...baseDestination };

  // Extract types for clean usage
  type T = Destination.TypesOf<I>;

  // Deep merge the config, handling nested objects like settings and mapping
  newDestination.config = assign(baseDestination.config, config, {
    shallow: true, // Create new object, don't mutate original
    merge: true, // Merge arrays
    extend: true, // Allow new properties
  });

  // Handle nested settings merging if both have settings
  if (baseDestination.config.settings && config.settings) {
    newDestination.config.settings = assign(
      baseDestination.config.settings as object,
      config.settings as object,
      { shallow: true, merge: true, extend: true },
    ) as typeof newDestination.config.settings;
  }

  // Handle nested mapping merging if both have mapping
  if (baseDestination.config.mapping && config.mapping) {
    newDestination.config.mapping = assign(
      baseDestination.config.mapping as object,
      config.mapping as object,
      { shallow: true, merge: true, extend: true },
    ) as typeof newDestination.config.mapping;
  }

  return newDestination;
}

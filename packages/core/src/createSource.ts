import type { Source, Collector } from './types';
import { assign } from './assign';

/**
 * Creates a new source function by merging a base source with additional configuration.
 *
 * This utility enables elegant source configuration while avoiding config side-effects
 * that could occur when reusing source functions across multiple collector instances.
 *
 * @template T - The source config type extending Source.Config
 * @template E - The source elb function type
 * @param source - The base source function to extend
 * @param config - Additional configuration to merge with the source's config
 * @returns A new source function with merged configuration
 *
 * @example
 * ```typescript
 * import { createSource } from '@walkeros/core';
 * import { sourceBrowser } from '@walkeros/web-source-browser';
 *
 * const configuredSource = createSource(sourceBrowser, {
 *   settings: {
 *     scope: document.body,
 *     session: true
 *   }
 * });
 *
 * const { elb } = await createCollector({
 *   sources: {
 *     browser: configuredSource
 *   }
 * });
 * ```
 */
export function createSource<T extends Source.Config, E = unknown>(
  source: Source.Init<T, E>,
  config: Partial<T>,
): Source.Init<T, E> {
  return async (
    collector: Collector.Instance,
    runtimeConfig: T,
  ): Promise<Source.CreateSource<T, E>> => {
    // Create merged configuration with proper deep merging
    const mergedConfig = assign(runtimeConfig, config, {
      shallow: true, // Create new object, don't mutate original
      merge: true, // Merge arrays
      extend: true, // Allow new properties
    }) as T;

    // Handle nested settings merging if both have settings
    if (runtimeConfig.settings && config.settings) {
      mergedConfig.settings = assign(runtimeConfig.settings, config.settings, {
        shallow: true,
        merge: true,
        extend: true,
      });
    }

    // Call the original source function with merged configuration
    return source(collector, mergedConfig);
  };
}

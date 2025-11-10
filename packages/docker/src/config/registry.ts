import type { Source, Destination } from '@walkeros/core';

/**
 * Registry of available sources (Phase 1: built-in only)
 * Phase 2 will support dynamic imports from @walkeros packages
 */
const SOURCE_REGISTRY: Record<string, Source.Init<any>> = {};

/**
 * Registry of available destinations (Phase 1: built-in only)
 * Phase 2 will support dynamic imports from @walkeros packages
 */
const DESTINATION_REGISTRY: Record<string, Destination.Instance<any>> = {};

/**
 * Register a source in the registry
 */
export function registerSource(name: string, source: Source.Init<any>): void {
  SOURCE_REGISTRY[name] = source;
}

/**
 * Register a destination in the registry
 */
export function registerDestination(
  name: string,
  destination: Destination.Instance<any>,
): void {
  DESTINATION_REGISTRY[name] = destination;
}

/**
 * Resolve code references in sources configuration
 * Converts string references like "sourceExpress" to actual function instances
 */
export function resolveSources(
  sources: Record<string, any>,
): Record<string, any> {
  return resolveCode(sources, SOURCE_REGISTRY, 'source');
}

/**
 * Resolve code references in destinations configuration
 * Converts string references like "destinationConsole" to actual instances
 */
export function resolveDestinations(
  destinations: Record<string, any>,
): Record<string, any> {
  return resolveCode(destinations, DESTINATION_REGISTRY, 'destination');
}

/**
 * Generic code resolution helper
 */
function resolveCode(
  items: Record<string, any>,
  registry: Record<string, any>,
  type: 'source' | 'destination',
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, item] of Object.entries(items)) {
    // If code is already a function/object, use it directly
    if (typeof item.code !== 'string') {
      resolved[key] = item;
      continue;
    }

    // Resolve string reference from registry
    const code = registry[item.code];
    if (!code) {
      throw new Error(
        `Unknown ${type} code reference: "${item.code}". Available ${type}s: ${Object.keys(registry).join(', ') || 'none'}`,
      );
    }

    resolved[key] = {
      ...item,
      code,
    };
  }

  return resolved;
}

/**
 * Get list of registered sources
 */
export function getRegisteredSources(): string[] {
  return Object.keys(SOURCE_REGISTRY);
}

/**
 * Get list of registered destinations
 */
export function getRegisteredDestinations(): string[] {
  return Object.keys(DESTINATION_REGISTRY);
}

import type { Source, Destination } from '@walkeros/core';

/**
 * Registry of available sources (Phase 1: built-in only)
 * Phase 2 will support dynamic imports from @walkeros packages
 */
const SOURCE_REGISTRY: Record<string, Source.Init> = {};

/**
 * Registry of available destinations (Phase 1: built-in only)
 * Phase 2 will support dynamic imports from @walkeros packages
 */
const DESTINATION_REGISTRY: Record<string, Destination.Instance> = {};

/**
 * Register a source in the registry
 */
export function registerSource(name: string, source: Source.Init): void {
  SOURCE_REGISTRY[name] = source;
}

/**
 * Register a destination in the registry
 */
export function registerDestination(
  name: string,
  destination: Destination.Instance,
): void {
  DESTINATION_REGISTRY[name] = destination;
}

/**
 * Resolve code references in sources configuration
 * Converts string references like "sourceExpress" to actual function instances
 */
export function resolveSources(
  sources: Record<string, unknown>,
): Record<string, unknown> {
  return resolveCode(sources, SOURCE_REGISTRY, 'source');
}

/**
 * Resolve code references in destinations configuration
 * Converts string references like "destinationConsole" to actual instances
 */
export function resolveDestinations(
  destinations: Record<string, unknown>,
): Record<string, unknown> {
  return resolveCode(destinations, DESTINATION_REGISTRY, 'destination');
}

/**
 * Generic code resolution helper
 */
function resolveCode(
  items: Record<string, unknown>,
  registry: Record<string, unknown>,
  type: 'source' | 'destination',
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(items)) {
    // Type guard for items with code property
    if (typeof item !== 'object' || item === null || !('code' in item)) {
      resolved[key] = item;
      continue;
    }

    const itemObj = item as { code: unknown; [key: string]: unknown };

    // If code is already a function/object, use it directly
    if (typeof itemObj.code !== 'string') {
      resolved[key] = item;
      continue;
    }

    // Resolve string reference from registry
    const code = registry[itemObj.code];
    if (!code) {
      throw new Error(
        `Unknown ${type} code reference: "${itemObj.code}". Available ${type}s: ${Object.keys(registry).join(', ') || 'none'}`,
      );
    }

    resolved[key] = {
      ...itemObj,
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

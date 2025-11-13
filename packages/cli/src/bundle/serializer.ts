/**
 * JSON to JavaScript serializer for config objects
 * Converts JSON objects to valid JavaScript code for use in templates
 */

import { isObject } from '../core/config';
import type {
  TemplateSource,
  TemplateDestination,
  ProcessedTemplateVariables,
} from '../types/template';

export interface SerializerOptions {
  indent?: number;
  singleQuotes?: boolean;
}

/**
 * Serialize a value to JavaScript code
 */
export function serializeToJS(
  value: unknown,
  options: SerializerOptions = {},
): string {
  const { indent = 2, singleQuotes = false } = options;
  const quote = singleQuotes ? "'" : '"';

  function serialize(val: unknown, currentIndent = 0): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';

    if (typeof val === 'boolean' || typeof val === 'number') {
      return String(val);
    }

    if (typeof val === 'string') {
      // Check if string contains arrow function syntax
      if (val.includes('=>')) {
        // More comprehensive check for arrow function patterns
        const arrowPatterns = [
          /^\s*\([^)]*\)\s*=>/, // (param) => or () =>
          /^\s*\w+\s*=>/, // param =>
          /^\s*\([^)]*\)\s*=>\s*\{/, // (param) => {
          /^\s*\w+\s*=>\s*\{/, // param => {
        ];

        if (arrowPatterns.some((pattern) => pattern.test(val))) {
          // Likely a function - return as-is without quotes
          return val;
        }
      }
      // Regular string - escape and quote
      return (
        quote +
        val.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"') +
        quote
      );
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';

      const nextIndent = currentIndent + indent;
      const spacing = ' '.repeat(nextIndent);
      const items = val
        .map((item) => spacing + serialize(item, nextIndent))
        .join(',\n');

      return `[\n${items}\n${' '.repeat(currentIndent)}]`;
    }

    if (isObject(val)) {
      const entries = Object.entries(val);
      if (entries.length === 0) return '{}';

      const nextIndent = currentIndent + indent;
      const spacing = ' '.repeat(nextIndent);

      const props = entries
        .map(([key, value]) => {
          // Check if key needs quotes (contains special characters or starts with number)
          const needsQuotes = /[^a-zA-Z0-9_$]/.test(key) || /^[0-9]/.test(key);
          const keyStr = needsQuotes ? quote + key + quote : key;

          return spacing + keyStr + ': ' + serialize(value, nextIndent);
        })
        .join(',\n');

      return `{\n${props}\n${' '.repeat(currentIndent)}}`;
    }

    // Fallback for other types
    return String(val);
  }

  return serialize(value);
}

/**
 * Serialize config object for template usage
 * Handles special cases for walkerOS configurations
 */
export function serializeConfig(config: Record<string, unknown>): string {
  // Handle empty config
  if (!config || Object.keys(config).length === 0) {
    return '{}';
  }

  return serializeToJS(config, { indent: 2, singleQuotes: true });
}

/**
 * Process template variables to serialize config objects
 */
export function processTemplateVariables(
  variables: Record<string, unknown>,
): ProcessedTemplateVariables {
  const processed = { ...variables };

  // Process sources object
  if (isObject(processed.sources)) {
    const sourcesObj = processed.sources as Record<string, unknown>;
    const processedSources: Record<string, TemplateSource> = {};

    for (const [name, source] of Object.entries(sourcesObj)) {
      const typedSource = source as TemplateSource;
      const { env: _, ...sourceWithoutEnv } = typedSource;
      processedSources[name] = {
        ...sourceWithoutEnv,
        config: isObject(typedSource.config)
          ? serializeConfig(typedSource.config)
          : typedSource.config, // Pass through string configs unchanged
        ...(typedSource.env !== undefined && { env: typedSource.env }),
      };
    }

    processed.sources = processedSources;
  }

  // Process destinations object
  if (isObject(processed.destinations)) {
    const destinationsObj = processed.destinations as Record<string, unknown>;
    const processedDestinations: Record<string, TemplateDestination> = {};

    for (const [name, dest] of Object.entries(destinationsObj)) {
      const typedDest = dest as TemplateDestination;
      const { env: _, ...destWithoutEnv } = typedDest;
      processedDestinations[name] = {
        ...destWithoutEnv,
        config: isObject(typedDest.config)
          ? serializeConfig(typedDest.config)
          : typedDest.config,
        ...(typedDest.env !== undefined && { env: typedDest.env }),
      };
    }

    processed.destinations = processedDestinations;
  }

  // Process collector object (if present)
  if (isObject(processed.collector)) {
    processed.collector = serializeConfig(
      processed.collector as Record<string, unknown>,
    );
  }

  return processed;
}

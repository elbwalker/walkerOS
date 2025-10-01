import { createTagger } from '@walkeros/web-source-browser';
import type { TaggerInstance } from '@walkeros/web-source-browser';
import type { WalkerOS } from '@walkeros/core';

// Centralized tagger configuration
const taggerInstance = createTagger({
  prefix: 'data-elb', // Match the browser source prefix
});

// Simple tagger export for use in components
export function tagger(entity?: string) {
  return taggerInstance(entity);
}

// DataElb interface for component props
export interface DataElb {
  entity?: string;
  trigger?: string;
  action?: string;
  data?: WalkerOS.Properties;
  context?: WalkerOS.Properties;
  globals?: WalkerOS.Properties;
  link?: Record<string, string>;
}

/**
 * Utility function to convert DataElb object to walkerOS tracking properties using the modern tagger API
 * @param dataElb - The walkerOS configuration object
 * @param componentName - Optional component name to add to context
 * @returns HTML attributes object ready to spread on elements
 */
export function createTrackingProps(
  dataElb?: DataElb,
  componentName?: string,
): Record<string, string> {
  if (!dataElb && !componentName) return {};

  const { entity, trigger, action, data, context, globals, link } =
    dataElb || {};

  // Start with tagger instance, using entity as naming scope if provided
  const instance = entity ? tagger(entity) : tagger();

  // Set entity if provided (creates data-elb attribute and updates naming scope)
  if (entity) {
    instance.entity(entity);
  }

  // Add action with trigger if both are provided, otherwise just action
  if (action) {
    if (trigger) {
      instance.action(trigger, action);
    } else {
      instance.action(action);
    }
  }

  // Add properties - the modern tagger handles undefined values gracefully
  if (data) {
    instance.data(data);
  }

  // Merge component name into context
  const mergedContext = { ...context };
  if (componentName) {
    mergedContext.component = [componentName];
  }

  if (Object.keys(mergedContext).length > 0) {
    instance.context(mergedContext);
  }

  if (globals) {
    instance.globals(globals);
  }

  if (link) {
    instance.link(link);
  }

  return instance.get();
}

// Re-export types for convenience
export type { TaggerInstance };

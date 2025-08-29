import { createTagger } from '@walkeros/web-source-browser';
import type { TaggerInstance } from '@walkeros/web-source-browser';
import type { DataElb } from '@walkeros/storybook-addon';

// Create a default tagger instance configured for the demo
export const tagger = createTagger({
  prefix: 'data-elb',
});

// Re-export types for convenience
export type { TaggerInstance, DataElb };

/**
 * Utility function to convert DataElb object to walkerOS tracking properties using the tagger
 * @param dataElb - The walkerOS configuration object
 * @returns HTML attributes object ready to spread on elements
 */
export function createTrackingProps(dataElb?: DataElb): Record<string, string> {
  if (!dataElb) return {};

  const { entity, trigger, action, data, context, globals, link } = dataElb;

  const instance = tagger(entity);

  // Add action with trigger if both are provided, otherwise just action
  if (action) {
    if (trigger) {
      instance.action(trigger, action);
    } else {
      instance.action('click', action);
    }
  }

  // Add properties - the tagger should handle undefined values gracefully
  if (data) {
    instance.data(data);
  }

  if (context) {
    instance.context(context);
  }

  if (globals) {
    instance.globals(globals);
  }

  if (link) {
    instance.link(link);
  }

  return instance.get();
}

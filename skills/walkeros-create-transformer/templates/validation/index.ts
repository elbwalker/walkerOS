import type { Transformer } from '@walkeros/core';
import type { Settings, Types } from './types';

/**
 * Transformer initialization using context pattern.
 *
 * @param context - Transformer context containing:
 *   - config: Transformer configuration (settings)
 *   - env: Environment object
 *   - logger: Logger instance
 *   - id: Unique transformer identifier
 *   - collector: Collector instance reference
 *   - ingest: Optional request metadata from source
 */
export const transformerRedact: Transformer.Init<Types> = (context) => {
  // Destructure what you need from context
  const { config = {} } = context;

  // Apply defaults inline — flow.json is developer-controlled, so no
  // runtime validation. Shape checks live in ./schemas and are used by
  // `walkeros validate` and dev tooling, never at runtime.
  const userSettings = config.settings || {};
  const settings: Settings = {
    fieldsToRedact: userSettings.fieldsToRedact ?? [],
    logRedactions: userSettings.logRedactions ?? false,
  };

  const fullConfig: Transformer.Config<Types> = {
    ...config,
    settings,
  };

  return {
    type: 'redact',
    config: fullConfig,

    /**
     * Process event - receives event and push context.
     *
     * @param event - The event to process
     * @param pushContext - Context for this specific push operation
     * @returns event - continue with modified event
     * @returns void - continue with current event unchanged
     * @returns false - stop chain, cancel further processing
     */
    push(event, pushContext) {
      const { logger } = pushContext;
      const fields = settings.fieldsToRedact || [];

      for (const field of fields) {
        if (event.data?.[field] !== undefined) {
          delete event.data[field];

          if (settings.logRedactions) {
            logger?.debug('Redacted field', { field });
          }
        }
      }

      return { event };
    },
  };
};

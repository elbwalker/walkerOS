import type { Transformer } from '@walkeros/core';
import type { Settings, Types } from './types';
import { SettingsSchema } from './schemas';

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

  // Validate and apply default settings using Zod schema
  const settings = SettingsSchema.parse(config.settings || {});

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

      return event;
    },
  };
};

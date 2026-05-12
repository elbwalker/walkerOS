import Ajv, { ValidateFunction } from 'ajv';
import type { Transformer } from '@walkeros/core';
import { formatSchema } from './format-schema';
import type { ValidatorSettings, JsonSchema } from './types';

export const transformerValidator: Transformer.Init<
  Transformer.Types<ValidatorSettings>
> = (context) => {
  const { config } = context;
  const settings = config.settings || {};
  const { format = true, events, schema } = settings;

  const ajv = new Ajv({ allErrors: true, strict: false });

  // Pre-compiled validators
  const formatValidator = format ? ajv.compile(formatSchema) : null;
  const schemaValidator = schema
    ? ajv.compile({ type: 'object', ...(schema as Record<string, unknown>) })
    : null;

  // Lazy event validators
  const eventValidators = new Map<string, ValidateFunction>();

  function getEventValidator(
    entity: string,
    action: string,
    eventSchema: JsonSchema,
  ): ValidateFunction {
    const key = `${entity}.${action}`;
    if (!eventValidators.has(key)) {
      eventValidators.set(
        key,
        ajv.compile({
          type: 'object',
          ...(eventSchema as Record<string, unknown>),
        }),
      );
    }
    return eventValidators.get(key)!;
  }

  /**
   * Find matching event schema using wildcard fallback.
   * Checks: entity.action → entity.* → *.action → *.*
   */
  function findEventSchema(
    entity: string,
    action: string,
  ): { schema: JsonSchema; key: string } | undefined {
    if (!events) return undefined;

    // Direct match
    if (events[entity]?.[action]) {
      return { schema: events[entity][action], key: `${entity} ${action}` };
    }
    // Entity wildcard
    if (events[entity]?.['*']) {
      return { schema: events[entity]['*'], key: `${entity} *` };
    }
    // Action wildcard
    if (events['*']?.[action]) {
      return { schema: events['*'][action], key: `* ${action}` };
    }
    // Global wildcard
    if (events['*']?.['*']) {
      return { schema: events['*']['*'], key: '* *' };
    }
    return undefined;
  }

  return {
    type: 'validator',
    config,

    async push(event, ctx) {
      const { logger } = ctx;

      // 1. Format
      if (formatValidator && !formatValidator(event)) {
        logger.error('Event format invalid', {
          errors: ajv.errorsText(formatValidator.errors),
        });
        return false;
      }

      // 2. Schema (whole-event)
      if (schemaValidator && !schemaValidator(event)) {
        logger.error('Schema validation failed', {
          errors: ajv.errorsText(schemaValidator.errors),
        });
        return false;
      }

      // 3. Events (entity-action keyed)
      if (events && event.entity && event.action) {
        const match = findEventSchema(event.entity, event.action);
        if (match) {
          const v = getEventValidator(event.entity, event.action, match.schema);
          if (!v(event)) {
            logger.error('Contract validation failed', {
              rule: match.key,
              errors: ajv.errorsText(v.errors),
            });
            return false;
          }
          logger.debug('Contract validation passed', { rule: match.key });
        }
      }

      return { event };
    },
  };
};

import Ajv, { ValidateFunction } from 'ajv';
import type { Transformer } from '@walkeros/core';
import { formatSchema } from './format-schema';
import type { ValidatorSettings, JsonSchema } from './types';

export const transformerValidator: Transformer.Init<
  Transformer.Types<ValidatorSettings>
> = (context) => {
  const { config } = context;
  const settings = config.settings || {};
  const {
    format = true,
    events,
    globals,
    context: ctx,
    custom,
    user,
    consent,
  } = settings;

  const ajv = new Ajv({ allErrors: true, strict: false });

  // Pre-compile format validator
  const formatValidator = format ? ajv.compile(formatSchema) : null;

  // Pre-compile section validators (run on every event)
  const sectionValidators: Array<{
    name: string;
    field: string;
    validate: ValidateFunction;
  }> = [];

  const sectionSchemas = { globals, context: ctx, custom, user, consent };
  for (const [name, schema] of Object.entries(sectionSchemas)) {
    if (schema) {
      sectionValidators.push({
        name,
        field: name,
        validate: ajv.compile({ type: 'object', ...schema }),
      });
    }
  }

  // Lazy-compiled event validators
  const eventValidators = new Map<string, ValidateFunction>();

  function getEventValidator(
    entity: string,
    action: string,
    schema: JsonSchema,
  ) {
    const key = `${entity}.${action}`;
    if (!eventValidators.has(key)) {
      eventValidators.set(key, ajv.compile({ type: 'object', ...schema }));
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

    async push(event, context) {
      const { logger } = context;

      // 1. Format validation (pre-compiled, fast)
      if (formatValidator && !formatValidator(event)) {
        logger.error('Event format invalid', {
          errors: ajv.errorsText(formatValidator.errors),
        });
        return false;
      }

      // 2. Section validation (pre-compiled, runs on every event)
      for (const { name, field, validate } of sectionValidators) {
        const value = (event as Record<string, unknown>)[field];
        if (!validate(value)) {
          logger.error(`${name} validation failed`, {
            errors: ajv.errorsText(validate.errors),
          });
          return false;
        }
      }

      // 3. Event validation (lazy compiled)
      if (events && event.entity && event.action) {
        const match = findEventSchema(event.entity, event.action);

        if (match) {
          const validator = getEventValidator(
            event.entity,
            event.action,
            match.schema,
          );

          if (!validator(event)) {
            logger.error('Contract validation failed', {
              rule: match.key,
              errors: ajv.errorsText(validator.errors),
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

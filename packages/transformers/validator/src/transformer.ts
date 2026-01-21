import Ajv, { ValidateFunction } from 'ajv';
import { getMappingEvent } from '@walkeros/core';
import type { Mapping, Transformer } from '@walkeros/core';
import { formatSchema } from './format-schema';
import type { ValidatorSettings, ContractRule, JsonSchema } from './types';

/**
 * Event validation transformer using AJV with JSON Schema.
 *
 * Two validation modes:
 * - format: Pre-compiled WalkerOS.Event structure validation (runs on every event)
 * - contract: Entity/action keyed business rules with lazy compilation
 */
export const transformerValidator: Transformer.Init<
  Transformer.Types<ValidatorSettings>
> = (context) => {
  const { config } = context;
  const settings = config.settings || {};
  const { format = true, contract } = settings;

  const ajv = new Ajv({ allErrors: true, strict: false });

  // Pre-compile format validator (runs on every event)
  const formatValidator = format ? ajv.compile(formatSchema) : null;

  // Lazy-compiled contract validators - keyed by schema reference
  // Using WeakMap to cache by schema object, handling array rules with conditions
  const contractValidators = new WeakMap<JsonSchema, ValidateFunction>();

  function getContractValidator(schema: JsonSchema) {
    if (!contractValidators.has(schema)) {
      // Auto-wrap with type: 'object'
      const fullSchema = { type: 'object', ...schema };
      contractValidators.set(schema, ajv.compile(fullSchema));
    }
    return contractValidators.get(schema)!;
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

      // 2. Contract validation (lazy compiled)
      if (contract) {
        // Contract is typed as Mapping.Rules<ContractRule> - cast needed for getMappingEvent
        const { eventMapping: rule, mappingKey } = await getMappingEvent(
          event,
          contract as Mapping.Rules,
        );

        // Type assertion: we know our rules have schema
        const contractRule = rule as ContractRule | undefined;

        if (contractRule?.schema) {
          const validator = getContractValidator(contractRule.schema);

          if (!validator(event)) {
            logger.error('Contract validation failed', {
              rule: mappingKey,
              errors: ajv.errorsText(validator.errors),
            });
            return false;
          }

          logger.debug('Contract validation passed', { rule: mappingKey });
        }
      }

      return event;
    },
  };
};

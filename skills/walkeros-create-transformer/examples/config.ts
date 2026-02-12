import type { Transformer } from '@walkeros/core';

/**
 * Example configurations for testing.
 * Define different config scenarios to test against.
 */

export const defaultConfig: Transformer.Config = {
  settings: {
    fieldsToRedact: ['email', 'phone'],
  },
};

export const strictConfig: Transformer.Config = {
  settings: {
    fieldsToRedact: ['email', 'phone', 'ip'],
    logRedactions: true,
  },
};

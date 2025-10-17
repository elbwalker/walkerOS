import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * JSON Schema for Mapping.ValueConfig
 *
 * Based on packages/core/src/types/mapping.ts
 *
 * Current fields (Phase 1):
 * - key: String path to extract value from event (e.g., 'data.id', 'user.email')
 * - validate: Function to validate the result
 * - condition: Conditionally apply this mapping (reuses existing widget)
 * - consent: Required consent to return value (reuses existing widget)
 *
 * Future fields (not yet implemented):
 * - fn: Custom transformation function
 * - value: Static value
 * - map: Object transformation
 * - set: Array of values
 * - loop: Array processing
 */
export const valueConfigSchema: RJSFSchema = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      title: 'Key',
      description: 'Extract value from event path (e.g., data.id, user.email)',
    },
    validate: {
      type: 'string',
      title: 'Validate',
      description: 'Validate the result',
    },
    condition: {
      type: 'string',
      title: 'Condition',
      description: 'Conditionally apply this mapping',
    },
    consent: {
      type: 'object',
      title: 'Consent',
      description: 'Required consent to return value',
      additionalProperties: {
        type: 'boolean',
      },
    },
  },
};

/**
 * UI Schema for Mapping.ValueConfig
 *
 * Customizes widget usage and layout for ValueConfig fields
 */
export const valueConfigUiSchema: UiSchema = {
  key: {
    'ui:widget': 'mappingString',
    'ui:placeholder': 'e.g., data.id, user.email',
  },
  validate: {
    'ui:field': 'mappingValidate',
  },
  condition: {
    'ui:field': 'mappingCondition',
  },
  consent: {
    'ui:field': 'mappingConsent',
  },
  'ui:layout': '1fr',
  'ui:responsive': true,
};

import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * JSON Schema for Mapping.ValueConfig
 *
 * Based on packages/core/src/types/mapping.ts
 *
 * Implemented fields:
 * - key: String path to extract value from event (e.g., 'data.id', 'user.email')
 * - value: Static value (string, number, boolean, or JSON object)
 * - validate: Function to validate the result
 * - condition: Conditionally apply this mapping
 * - consent: Required consent to return value
 * - map: Object transformation
 * - set: Array of values
 *
 * Future fields (not yet implemented):
 * - fn: Custom transformation function
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
    value: {
      type: ['string', 'number', 'boolean', 'object'],
      title: 'Value',
      description: 'Static value to return',
      default: '',
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
    map: {
      type: 'object',
      title: 'Map',
      description: 'Transform object properties',
      additionalProperties: true,
    },
    set: {
      type: 'array',
      title: 'Set',
      description: 'Array of static values',
      items: {
        oneOf: [{ type: 'string' }, { type: 'object' }],
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
  value: {
    'ui:widget': 'mappingValue',
    'ui:emptyValue': '',
    'ui:options': {
      emptyValue: '',
    },
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
  map: {
    'ui:field': 'mappingMap',
  },
  set: {
    'ui:field': 'mappingSet',
  },
  'ui:layout': '1fr',
  'ui:responsive': true,
};

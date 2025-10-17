import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * JSON Schema for Mapping.Rule
 *
 * Based on packages/core/src/types/mapping.ts
 *
 * Current fields:
 * - name: Custom event name (string)
 * - ignore: Skip processing (boolean)
 * - batch: Bundle events (number)
 * - consent: Required consent states (object)
 * - condition: Function to conditionally apply mapping (string)
 *
 * Future expansion will add:
 * - data: Value mapping (complex)
 * - settings: Custom settings (varies by destination)
 */
export const mappingRuleSchema: RJSFSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      description: 'Custom name for the mapped event',
    },
    ignore: {
      type: 'boolean',
      title: 'Ignore',
      description: 'Skip processing this event',
    },
    batch: {
      type: 'number',
      title: 'Batch',
      description: 'Milliseconds to wait before sending',
      minimum: 1,
    },
    consent: {
      type: 'object',
      title: 'Consent',
      description: 'Required consent states to process the event',
      additionalProperties: {
        type: 'boolean',
      },
    },
    condition: {
      type: 'string',
      title: 'Condition',
      description: 'Conditionally apply this mapping rule',
    },
  },
};

/**
 * UI Schema for Mapping.Rule
 *
 * Customizes widget usage and layout
 * Layout: Name (50%), Ignore (25%), Batch (25%)
 */
export const mappingRuleUiSchema: UiSchema = {
  name: {
    'ui:widget': 'mappingString',
    'ui:placeholder': 'e.g., view_item',
  },
  ignore: {
    'ui:widget': 'mappingBoolean',
  },
  batch: {
    'ui:widget': 'mappingNumber',
    'ui:placeholder': 'Milliseconds',
  },
  consent: {
    'ui:field': 'mappingConsent',
  },
  condition: {
    'ui:field': 'mappingCondition',
  },
  'ui:layout': '2fr 1fr 1fr',
  'ui:responsive': true,
};

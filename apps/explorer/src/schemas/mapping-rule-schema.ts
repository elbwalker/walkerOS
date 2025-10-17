import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * JSON Schema for Mapping.Rule
 *
 * Based on packages/core/src/types/mapping.ts
 *
 * Current fields:
 * - name: Custom event name (string)
 * - batch: Bundle events (number)
 * - data: Value mapping (object - ValueConfig)
 * - consent: Required consent states (object)
 * - condition: Function to conditionally apply mapping (string)
 *
 * Note: ignore field is handled separately in the footer, not in the form
 *
 * Future expansion will add:
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
    batch: {
      type: 'number',
      title: 'Batch',
      description: 'Milliseconds to wait before sending',
      minimum: 1,
    },
    data: {
      type: 'object',
      title: 'Data',
      description: 'Transform event data',
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
 * Layout: Name (50%), Batch (50%), Data (full width), Consent (50%), Condition (50%)
 */
export const mappingRuleUiSchema: UiSchema = {
  name: {
    'ui:widget': 'mappingString',
    'ui:placeholder': 'e.g., view_item',
  },
  batch: {
    'ui:widget': 'mappingNumber',
    'ui:placeholder': 'Milliseconds',
  },
  data: {
    'ui:field': 'mappingData',
  },
  consent: {
    'ui:field': 'mappingConsent',
  },
  condition: {
    'ui:field': 'mappingCondition',
  },
  'ui:layout': '1fr 1fr',
  'ui:responsive': true,
};

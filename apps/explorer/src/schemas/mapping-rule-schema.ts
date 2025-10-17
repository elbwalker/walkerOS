import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * JSON Schema for Mapping.Rule
 *
 * Based on packages/core/src/types/mapping.ts
 *
 * Starting with basic fields only:
 * - name: Custom event name (string)
 * - ignore: Skip processing (boolean)
 * - batch: Bundle events (number)
 *
 * Future expansion will add:
 * - data: Value mapping (complex)
 * - consent: Required consent states (object)
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
  'ui:layout': '2fr 1fr 1fr',
  'ui:responsive': true,
};

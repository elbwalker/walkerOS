import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * Universal schema for standard Mapping.Rule properties
 *
 * These are the built-in properties available on every mapping rule,
 * regardless of destination. Defined in @walkeros/core/types/mapping.ts
 *
 * Properties:
 * - name: string - Override destination event name
 * - batch: number - Batch size in milliseconds or event count
 * - ignore: boolean - Skip processing this event
 * - condition: function - When to apply this rule
 * - consent: object - Required consent states
 * - policy: object - Event-level policy rules
 * - data: ValueType - Event data transformation
 * - settings: object - Destination-specific rule settings (schema comes from destination)
 */

/**
 * Schema for 'name' property
 */
export const namePropertySchema: RJSFSchema = {
  type: 'string',
  title: 'Event Name Override',
  description: 'Override the destination event name with a custom string',
  minLength: 1,
  maxLength: 100,
  examples: ['page_view', 'PageView', 'view_item', 'product.viewed'],
};

export const namePropertyUiSchema: UiSchema = {
  'ui:placeholder': 'e.g., page_view, PageView, view_item',
  'ui:help':
    'This string will be sent to the destination instead of the default entity-action name',
};

/**
 * Schema for 'batch' property
 */
export const batchPropertySchema: RJSFSchema = {
  type: 'number',
  title: 'Batch Size',
  description: 'Batch size in milliseconds (time-based) or event count',
  minimum: 1,
  maximum: 60000,
  examples: [200, 1000, 5000],
};

export const batchPropertyUiSchema: UiSchema = {
  'ui:placeholder': 'e.g., 200, 1000, 5000',
  'ui:help':
    'Events will be collected and sent in batches. Use time (ms) for timed batches or count for event-based batches',
};

/**
 * Get schema for a standard rule property
 *
 * @param propertyName - Name of the rule property (e.g., 'name', 'batch')
 * @returns JSON Schema for the property, or undefined if not found
 */
export function getRulePropertySchema(
  propertyName: string,
): RJSFSchema | undefined {
  switch (propertyName) {
    case 'name':
      return namePropertySchema;
    case 'batch':
      return batchPropertySchema;
    default:
      return undefined;
  }
}

/**
 * Get UI schema for a standard rule property
 *
 * @param propertyName - Name of the rule property (e.g., 'name', 'batch')
 * @returns UI Schema for the property, or undefined if not found
 */
export function getRulePropertyUiSchema(
  propertyName: string,
): UiSchema | undefined {
  switch (propertyName) {
    case 'name':
      return namePropertyUiSchema;
    case 'batch':
      return batchPropertyUiSchema;
    default:
      return undefined;
  }
}

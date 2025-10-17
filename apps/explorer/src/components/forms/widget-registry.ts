import type { RegistryWidgetsType } from '@rjsf/utils';
import { MappingStringWidget } from '../atoms/mapping-string';
import { MappingNumberWidget } from '../atoms/mapping-number';
import { MappingBooleanWidget } from '../atoms/mapping-boolean';

/**
 * Widget Registry for RJSF Mapping Forms
 *
 * Central registry of all custom mapping widgets used in react-jsonschema-form.
 * Widgets are registered here and referenced in uiSchema via 'ui:widget' property.
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   name: {
 *     'ui:widget': 'mappingString'
 *   }
 * }
 *
 * @example
 * // In Form component:
 * <Form
 *   schema={schema}
 *   widgets={mappingWidgets}
 *   ...
 * />
 *
 * To add a new widget:
 * 1. Create the widget component in src/components/atoms/mapping-*.tsx
 * 2. Import it here
 * 3. Add to the mappingWidgets object with a descriptive key
 * 4. Reference it in uiSchema using the key
 */

/**
 * Mapping Widgets Registry
 *
 * Available widgets:
 * - mappingString: Text input for string values
 * - mappingNumber: Number input with min/max validation
 * - mappingBoolean: Checkbox for boolean values
 */
export const mappingWidgets: RegistryWidgetsType = {
  mappingString: MappingStringWidget,
  mappingNumber: MappingNumberWidget,
  mappingBoolean: MappingBooleanWidget,
};

import type { RegistryFieldsType } from '@rjsf/utils';
import { MappingConsentField } from '../atoms/mapping-consent-field';
import { MappingConditionField } from '../atoms/mapping-condition-field';
import { MappingFnField } from '../atoms/mapping-fn-field';
import { MappingKeyField } from '../atoms/mapping-key-field';
import { MappingValidateField } from '../atoms/mapping-validate-field';
import { MappingDataField } from '../atoms/mapping-data-field';
import { MappingSettingsField } from '../atoms/mapping-settings-field';
import { MappingObjectExplorerField } from '../atoms/mapping-object-explorer-field';
import { MappingMapField } from '../molecules/mapping-map-field';
import { MappingSetField } from '../molecules/mapping-set-field';
import { MappingLoopField } from '../molecules/mapping-loop-field';

/**
 * Field Registry for RJSF Mapping Forms
 *
 * Central registry of all custom fields used in react-jsonschema-form.
 * Fields are used for complex types (like objects) while widgets are for primitives.
 * Fields are referenced in uiSchema via 'ui:field' property.
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   consent: {
 *     'ui:field': 'mappingConsent'
 *   }
 * }
 *
 * @example
 * // In Form component:
 * <Form
 *   schema={schema}
 *   fields={mappingFields}
 *   ...
 * />
 */

/**
 * Mapping Fields Registry
 *
 * Available fields:
 * - mappingConsent: Collapsible consent requirements editor for object types
 * - mappingCondition: Checkbox-collapsible condition function editor for string types
 * - mappingFn: Checkbox-collapsible custom transformation function editor for string types
 * - mappingKey: Simple text input for event path extraction (e.g., 'data.id', 'user.email')
 * - mappingValidate: Checkbox-collapsible validate function editor for string types
 * - mappingData: Toggle-collapsible data transformation editor for object types
 * - mappingSettings: Destination-specific settings editor (schema-aware or JSON fallback)
 * - objectExplorer: Generic object key-value explorer with add/rename/delete/navigate
 * - mappingMap: Key-value pair editor for object transformation mapping
 * - mappingSet: Array of values editor for static value arrays
 * - mappingLoop: Array processing with transformation editor for loop tuples
 */
export const mappingFields: RegistryFieldsType = {
  mappingConsent: MappingConsentField,
  mappingCondition: MappingConditionField,
  mappingFn: MappingFnField,
  mappingKey: MappingKeyField,
  mappingValidate: MappingValidateField,
  mappingData: MappingDataField,
  mappingSettings: MappingSettingsField,
  objectExplorer: MappingObjectExplorerField,
  mappingMap: MappingMapField,
  mappingSet: MappingSetField,
  mappingLoop: MappingLoopField,
};

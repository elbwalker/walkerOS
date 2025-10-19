import type { RegistryFieldsType } from '@rjsf/utils';
import { MappingConsentField } from '../atoms/mapping-consent-field';
import { MappingConditionField } from '../atoms/mapping-condition-field';
import { MappingValidateField } from '../atoms/mapping-validate-field';
import { MappingDataField } from '../atoms/mapping-data-field';
import { MappingMapField } from '../molecules/mapping-map-field';
import { MappingSetField } from '../molecules/mapping-set-field';

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
 * - mappingValidate: Checkbox-collapsible validate function editor for string types
 * - mappingData: Toggle-collapsible data transformation editor for object types
 * - mappingMap: Key-value pair editor for object transformation mapping
 * - mappingSet: Array of values editor for static value arrays
 */
export const mappingFields: RegistryFieldsType = {
  mappingConsent: MappingConsentField,
  mappingCondition: MappingConditionField,
  mappingValidate: MappingValidateField,
  mappingData: MappingDataField,
  mappingMap: MappingMapField,
  mappingSet: MappingSetField,
};

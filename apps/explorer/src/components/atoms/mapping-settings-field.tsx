import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingSettingsWidget } from './mapping-settings';

/**
 * MappingSettingsField - RJSF field wrapper for destination-specific settings
 *
 * Bridges RJSF FieldProps to our custom MappingSettingsWidget.
 * Required because RJSF uses fields (not widgets) for complex object types.
 *
 * Follows the same pattern as:
 * - MappingDataField → MappingDataWidget
 * - MappingConsentField → MappingConsentWidget
 * - MappingConditionField → MappingConditionWidget
 *
 * @example
 * // Register in field registry:
 * export const mappingFields: RegistryFieldsType = {
 *   mappingSettings: MappingSettingsField,
 * };
 *
 * @example
 * // Use in uiSchema:
 * const uiSchema = {
 *   settings: {
 *     'ui:field': 'mappingSettings',
 *     'ui:options': {
 *       schema: destinationSchema.mappingSchema,
 *       uiSchema: destinationSchema.mappingUiSchema
 *     }
 *   }
 * };
 */
export function MappingSettingsField(props: FieldProps) {
  const {
    formData,
    onChange,
    schema,
    uiSchema,
    idSchema,
    rawErrors,
    disabled,
    readonly,
  } = props;

  const widgetProps = {
    id: idSchema.$id,
    value: formData,
    onChange,
    schema,
    uiSchema,
    rawErrors: rawErrors || [],
    disabled: disabled || false,
    readonly: readonly || false,
  };

  // @ts-expect-error - WidgetProps type mismatch, consistent with other mapping fields
  return <MappingSettingsWidget {...widgetProps} />;
}

export default MappingSettingsField;

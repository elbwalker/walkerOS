import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingDataWidget } from './mapping-data';

/**
 * MappingDataField - RJSF field wrapper for data transformation
 *
 * Bridges RJSF FieldProps to our custom MappingDataWidget.
 * Required because RJSF uses fields (not widgets) for complex object types.
 *
 * @example
 * // Register in field registry:
 * export const mappingFields: RegistryFieldsType = {
 *   mappingData: MappingDataField,
 * };
 *
 * @example
 * // Use in uiSchema:
 * const uiSchema = {
 *   data: {
 *     'ui:field': 'mappingData'
 *   }
 * };
 */
export function MappingDataField(props: FieldProps) {
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

  // @ts-expect-error - Old Phase 1 component, RJSF WidgetProps type mismatch to be fixed in Phase 5
  return <MappingDataWidget {...widgetProps} />;
}

import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingValidateWidget } from './mapping-validate';

/**
 * MappingValidateField - RJSF field wrapper for validate
 *
 * Bridges RJSF FieldProps to our custom MappingValidateWidget.
 * Required because RJSF uses fields (not widgets) for complex types.
 *
 * @example
 * // Register in field registry:
 * export const mappingFields: RegistryFieldsType = {
 *   mappingValidate: MappingValidateField,
 * };
 *
 * @example
 * // Use in uiSchema:
 * const uiSchema = {
 *   validate: {
 *     'ui:field': 'mappingValidate'
 *   }
 * };
 */
export function MappingValidateField(props: FieldProps) {
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

  return <MappingValidateWidget {...widgetProps} />;
}

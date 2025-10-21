import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingFnWidget } from './mapping-fn';

/**
 * MappingFnField - RJSF field wrapper for fn (transformation function)
 *
 * Bridges RJSF FieldProps to our custom MappingFnWidget.
 * Required because RJSF uses fields (not widgets) for complex types.
 *
 * @example
 * // Register in field registry:
 * export const mappingFields: RegistryFieldsType = {
 *   mappingFn: MappingFnField,
 * };
 *
 * @example
 * // Use in uiSchema:
 * const uiSchema = {
 *   fn: {
 *     'ui:field': 'mappingFn'
 *   }
 * };
 */
export function MappingFnField(props: FieldProps) {
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
  return <MappingFnWidget {...widgetProps} />;
}

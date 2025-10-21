import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingKeyWidget } from './mapping-key';

/**
 * MappingKeyField - RJSF field wrapper for key property
 *
 * Bridges RJSF FieldProps to our custom MappingKeyWidget.
 * Required because RJSF uses fields (not widgets) for custom field rendering.
 *
 * @example
 * // Register in field registry:
 * export const mappingFields: RegistryFieldsType = {
 *   mappingKey: MappingKeyField,
 * };
 *
 * @example
 * // Use in uiSchema:
 * const uiSchema = {
 *   key: {
 *     'ui:field': 'mappingKey'
 *   }
 * };
 */
export function MappingKeyField(props: FieldProps) {
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
    placeholder: uiSchema?.['ui:placeholder'] as string | undefined,
  };

  // @ts-expect-error - RJSF WidgetProps type mismatch, will be fixed in Phase 5
  return <MappingKeyWidget {...widgetProps} />;
}

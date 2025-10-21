import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingConditionWidget } from './mapping-condition';

/**
 * MappingConditionField - RJSF custom field for condition strings
 *
 * This is a field wrapper (not a widget) because RJSF requires custom fields
 * for complex types. The field wraps our MappingConditionWidget and provides
 * the necessary interface that RJSF expects for custom fields.
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   condition: {
 *     'ui:field': 'mappingCondition'
 *   }
 * }
 */
export function MappingConditionField(props: FieldProps) {
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

  // Convert FieldProps to WidgetProps format
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
  return <MappingConditionWidget {...widgetProps} />;
}

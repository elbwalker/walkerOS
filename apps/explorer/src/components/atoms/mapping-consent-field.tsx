import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingConsentWidget } from './mapping-consent';

/**
 * MappingConsentField - RJSF custom field for consent object
 *
 * This is a field wrapper (not a widget) because RJSF requires custom fields
 * for object types, not widgets. Widgets are only used for primitive types.
 *
 * The field wraps our MappingConsentWidget and provides the necessary
 * interface that RJSF expects for custom fields.
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   consent: {
 *     'ui:field': 'mappingConsent'
 *   }
 * }
 */
export function MappingConsentField(props: FieldProps) {
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

  return <MappingConsentWidget {...widgetProps} />;
}

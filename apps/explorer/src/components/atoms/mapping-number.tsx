import React from 'react';
import type { WidgetProps } from '@rjsf/utils';

/**
 * MappingNumber - Custom RJSF widget for number inputs
 *
 * A styled number input widget that integrates with RJSF forms and uses
 * the explorer's CSS variable theming system. Handles number parsing,
 * validation (min/max from schema), and displays errors.
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     priority: {
 *       type: 'number',
 *       minimum: 0,
 *       maximum: 100
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   priority: {
 *     'ui:widget': 'mappingNumber',
 *     'ui:placeholder': 'Enter priority...'
 *   }
 * }
 */
export function MappingNumberWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    placeholder,
    rawErrors = [],
    required,
    schema,
  } = props;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    // Handle empty input
    if (inputValue === '') {
      onChange(undefined);
      return;
    }

    // Parse number
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  const hasError = rawErrors && rawErrors.length > 0;

  // Extract min/max from schema if defined
  const min = schema.minimum;
  const max = schema.maximum;

  return (
    <div className="elb-rjsf-widget">
      <input
        id={id}
        type="number"
        className={`elb-rjsf-input ${hasError ? 'elb-rjsf-input-error' : ''}`}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled || readonly}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step="any"
      />
      {hasError && (
        <div className="elb-rjsf-error">
          {rawErrors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import type { WidgetProps } from '@rjsf/utils';

/**
 * MappingString - Custom RJSF widget for string inputs
 *
 * A styled text input widget that integrates with RJSF forms and uses
 * the explorer's CSS variable theming system. Displays validation errors
 * and supports disabled/readonly states.
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   name: {
 *     'ui:widget': 'mappingString',
 *     'ui:placeholder': 'Enter mapping name...'
 *   }
 * }
 */
export function MappingStringWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    placeholder,
    rawErrors = [],
    required,
  } = props;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value === '' ? undefined : event.target.value);
  };

  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <div className="elb-rjsf-widget">
      <input
        id={id}
        type="text"
        className={`elb-rjsf-input ${hasError ? 'elb-rjsf-input-error' : ''}`}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled || readonly}
        placeholder={placeholder}
        required={required}
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

import React from 'react';
import type { WidgetProps } from '@rjsf/utils';

/**
 * MappingBoolean - Custom RJSF widget for boolean checkbox
 *
 * A styled checkbox widget that matches the height and styling of text inputs.
 * The label is handled by FieldTemplate, so this widget only renders the
 * checkbox control itself.
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     enabled: {
 *       type: 'boolean',
 *       title: 'Ignore Event',
 *       description: 'Skip processing this event'
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   enabled: {
 *     'ui:widget': 'mappingBoolean'
 *   }
 * }
 */
export function MappingBooleanWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    rawErrors = [],
    schema,
  } = props;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <div className="elb-rjsf-widget">
      <input
        id={id}
        type="checkbox"
        className={`elb-rjsf-checkbox ${hasError ? 'elb-rjsf-input-error' : ''}`}
        checked={value ?? false}
        onChange={handleChange}
        disabled={disabled || readonly}
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

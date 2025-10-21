import React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { FieldHeader } from './field-header';

/**
 * MappingKeyWidget - RJSF widget for key property
 *
 * Manages the key property of ValueConfig - a string path to extract
 * values from events (e.g., 'data.id', 'user.email', 'globals.currency').
 *
 * Features:
 * - Simple text input for path entry
 * - Helpful examples and common path patterns
 * - Clean, focused interface for single property editing
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     key: {
 *       type: 'string',
 *       title: 'Key',
 *       description: 'Extract value from event path'
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   key: {
 *     'ui:widget': 'mappingKey'
 *   }
 * }
 */
export function MappingKeyWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    rawErrors = [],
    schema,
    placeholder,
  } = props;

  const keyValue = (value as string | undefined) || '';

  // Extract title and description from schema
  const title = schema?.title || 'Key';
  const description = schema?.description || 'Extract value from event path';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue || undefined);
  };

  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <div className="elb-rjsf-widget">
      <FieldHeader title={title} description={description} />

      <input
        id={id}
        type="text"
        value={keyValue}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readonly}
        className="elb-auto-select-input"
        placeholder={placeholder || 'e.g., data.id, user.email'}
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

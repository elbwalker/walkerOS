import React, { useState, useEffect } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { CodeBox } from '../organisms/code-box';
import { FieldHeader } from './field-header';

/**
 * MappingValueWidget - Widget for static PropertyType values
 *
 * Supports:
 * - String: text input
 * - Number: number input
 * - Boolean: checkbox
 * - Object: JSON editor (CodeBox)
 *
 * Features:
 * - Custom header with type selector positioned right
 * - Smart type detection based on current value
 * - Title and description rendered in widget (not by FieldTemplate)
 */
export function MappingValueWidget(props: WidgetProps) {
  const { value, onChange, disabled, readonly, schema, label } = props;

  // Extract title and description from schema or props
  // When using oneOf, RJSF may not pass description through schema
  const title = schema?.title || label || 'Value';
  const description = schema?.description || 'Static value to return';

  // Determine type from actual value, default to string
  const getCurrentType = (): 'string' | 'number' | 'boolean' | 'object' => {
    // Explicit undefined/null check - default to string for empty values
    if (value === undefined || value === null || value === '') return 'string';

    const valueType = typeof value;

    // Check for object type (but not arrays)
    if (valueType === 'object' && !Array.isArray(value)) return 'object';

    // Check for primitive types - including 0, false, and empty string
    if (valueType === 'number' || valueType === 'boolean') return valueType;
    if (valueType === 'string') return 'string';

    // Default fallback
    return 'string';
  };

  const [selectedType, setSelectedType] = useState<
    'string' | 'number' | 'boolean' | 'object'
  >(getCurrentType);

  // Sync selectedType with value changes from outside (e.g., RJSF initialization)
  useEffect(() => {
    const detectedType = getCurrentType();
    if (detectedType !== selectedType) {
      setSelectedType(detectedType);
    }
  }, [value]);

  const handleTypeChange = (
    newType: 'string' | 'number' | 'boolean' | 'object',
  ) => {
    setSelectedType(newType);

    // Set default value for new type
    switch (newType) {
      case 'string':
        onChange('');
        break;
      case 'number':
        onChange(0);
        break;
      case 'boolean':
        onChange(false);
        break;
      case 'object':
        onChange({});
        break;
    }
  };

  const handleStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value);
    onChange(isNaN(num) ? 0 : num);
  };

  const handleBooleanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  const handleObjectChange = (code: string) => {
    try {
      const parsed = JSON.parse(code);
      onChange(parsed);
    } catch {
      // Keep existing value if invalid JSON
    }
  };

  return (
    <div className="elb-rjsf-widget">
      {/* Reusable header with type selector */}
      <FieldHeader
        title={title}
        description={description}
        action={
          <select
            className="elb-value-widget-type-select"
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value as any)}
            disabled={disabled || readonly}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
          </select>
        }
      />

      {/* Input based on selected type */}
      {selectedType === 'string' && (
        <input
          type="text"
          value={(value as string) || ''}
          onChange={handleStringChange}
          disabled={disabled}
          readOnly={readonly}
          className="elb-auto-select-input"
          placeholder="Enter string value"
        />
      )}

      {selectedType === 'number' && (
        <input
          type="number"
          value={typeof value === 'number' ? value : 0}
          onChange={handleNumberChange}
          disabled={disabled}
          readOnly={readonly}
          className="elb-auto-select-input"
          placeholder="Enter number value"
        />
      )}

      {selectedType === 'boolean' && (
        <div className="elb-value-widget-boolean">
          <input
            type="checkbox"
            checked={(value as boolean) || false}
            onChange={handleBooleanChange}
            disabled={disabled || readonly}
            id="value-boolean-checkbox"
          />
          <label htmlFor="value-boolean-checkbox">
            {(value as boolean) ? 'true' : 'false'}
          </label>
        </div>
      )}

      {selectedType === 'object' && (
        <CodeBox
          code={JSON.stringify(value || {}, null, 2)}
          onChange={handleObjectChange}
          language="json"
          height={120}
          readOnly={readonly}
        />
      )}
    </div>
  );
}

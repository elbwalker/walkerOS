import React, { useState, useEffect } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { CodeBox } from '../organisms/code-box';
import { FieldHeader } from './field-header';
import { Toggle } from './toggle';

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
  const { value, onChange, disabled, readonly, schema, label, options } = props;

  // Extract title and description from schema or props
  // When using oneOf, RJSF may not pass description through schema
  const title = schema?.title || label || 'Value';
  const description = schema?.description || 'Static value to return';

  // Get emptyValue from options if specified
  const emptyValue = options?.emptyValue;

  // Determine type from actual value, default to none if undefined
  const getCurrentType = ():
    | 'none'
    | 'string'
    | 'number'
    | 'boolean'
    | 'object' => {
    // If value matches emptyValue, treat as string (to preserve empty strings)
    if (emptyValue !== undefined && value === emptyValue) {
      return 'string';
    }

    // Explicit undefined/null check - default to none for empty values
    if (value === undefined || value === null) return 'none';

    const valueType = typeof value;

    // Check for object type (but not arrays)
    if (valueType === 'object' && !Array.isArray(value)) return 'object';

    // Check for primitive types - including 0, false, and empty string
    if (valueType === 'number' || valueType === 'boolean') return valueType;
    if (valueType === 'string') return 'string';

    // Default fallback
    return 'none';
  };

  const [selectedType, setSelectedType] = useState<
    'none' | 'string' | 'number' | 'boolean' | 'object'
  >(getCurrentType);

  // Track if user manually selected a type (to prevent auto-switching)
  const userSelectedTypeRef = React.useRef(false);

  // Track previous value to detect external changes (not user typing)
  const prevValueRef = React.useRef(value);

  // Sync selectedType only when value changes externally (e.g., loading new rule)
  useEffect(() => {
    // Detect if this is an external change by checking if value type changed
    const prevType = typeof prevValueRef.current;
    const currentType = typeof value;

    // Check if this is a major type change (switching rules)
    const isMajorTypeChange =
      prevType !== currentType ||
      (value === undefined && prevValueRef.current !== undefined) ||
      (value !== undefined && prevValueRef.current === undefined);

    if (isMajorTypeChange) {
      // Reset the user selection flag when loading new rule
      userSelectedTypeRef.current = false;
      const detectedType = getCurrentType();
      setSelectedType(detectedType);
    } else if (userSelectedTypeRef.current) {
      // User manually selected a type, keep it even if value changes
      // This allows empty string to stay as 'string' type
    }

    prevValueRef.current = value;
  }, [value]);

  const handleTypeChange = (
    newType: 'none' | 'string' | 'number' | 'boolean' | 'object',
  ) => {
    // Mark that user manually selected a type
    userSelectedTypeRef.current = true;
    setSelectedType(newType);

    // Set default value for new type
    switch (newType) {
      case 'none':
        onChange(undefined);
        break;
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
    // Always pass the string value, even if empty
    // Use emptyValue if specified and value is empty, otherwise use the actual value
    const stringValue = e.target.value;
    const valueToSend =
      stringValue === '' && emptyValue !== undefined ? emptyValue : stringValue;
    onChange(valueToSend);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value);
    onChange(isNaN(num) ? 0 : num);
  };

  const handleBooleanChange = (checked: boolean) => {
    onChange(checked);
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e) => handleTypeChange(e.target.value as any)}
            disabled={disabled || readonly}
          >
            <option value="none">None</option>
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
        <Toggle
          checked={!Boolean(value)}
          onChange={(checked) => handleBooleanChange(!checked)}
          disabled={disabled || readonly}
          label={value ? 'true' : 'false'}
        />
      )}

      {selectedType === 'object' && (
        <CodeBox
          code={JSON.stringify(value || {}, null, 2)}
          onChange={handleObjectChange}
          language="json"
          height={120}
          // @ts-expect-error - Old Phase 1 component, readOnly prop type mismatch to be fixed in Phase 5
          readOnly={readonly}
        />
      )}
    </div>
  );
}

import React from 'react';
import { IconButton } from './icon-button';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import {
  valueConfigSchema,
  valueConfigUiSchema,
} from '../../schemas/value-config-schema';
import { cleanFormData } from '../../utils/clean-form-data';

export interface SetEntry {
  value: string | Record<string, unknown>;
  tempId: string;
}

export interface MappingSetEntryProps {
  entry: SetEntry;
  onChange: (entry: SetEntry) => void;
  onRemove: () => void;
  index: number;
  isDragging?: boolean;
  isDragOver?: boolean;
}

/**
 * MappingSetEntry - Single value entry in a set array
 *
 * Features:
 * - Type selector (Simple/Advanced)
 * - Simple mode: String input for key paths
 * - Advanced mode: Full ValueConfig form
 * - Delete button
 *
 * @example
 * <MappingSetEntry
 *   entry={{ value: 'data.id', tempId: '123' }}
 *   onChange={handleChange}
 *   onRemove={handleRemove}
 *   index={0}
 * />
 */
export function MappingSetEntry({
  entry,
  onChange,
  onRemove,
  index,
  isDragging = false,
  isDragOver = false,
}: MappingSetEntryProps) {
  const valueType = typeof entry.value === 'string' ? 'simple' : 'advanced';

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'simple' | 'advanced';

    if (newType === valueType) return;

    if (newType === 'advanced') {
      // Convert simple string to ValueConfig
      const stringValue = entry.value as string;
      onChange({
        ...entry,
        value: stringValue ? { key: stringValue } : {},
      });
    } else {
      // Convert ValueConfig to simple string
      const config = entry.value as Record<string, unknown>;
      let extractedValue = '';

      // Priority: key > value > empty string
      if (config.key && typeof config.key === 'string') {
        extractedValue = config.key;
      } else if (
        config.value !== undefined &&
        typeof config.value === 'string'
      ) {
        extractedValue = config.value;
      }

      onChange({
        ...entry,
        value: extractedValue,
      });
    }
  };

  const handleSimpleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...entry, value: e.target.value });
  };

  const handleAdvancedValueChange = (data: unknown) => {
    // Clean the nested ValueConfig data to remove empty values
    const cleaned = cleanFormData(data as Record<string, unknown>);
    const finalValue = Object.keys(cleaned).length > 0 ? cleaned : {};
    onChange({ ...entry, value: finalValue });
  };

  return (
    <div
      className={`elb-mapping-set-entry ${
        valueType === 'advanced' ? 'elb-mapping-set-entry-advanced' : ''
      } ${isDragging ? 'elb-mapping-set-entry-dragging' : ''} ${
        isDragOver ? 'elb-mapping-set-entry-drag-over' : ''
      }`}
    >
      {/* Drag handle */}
      <div className="elb-mapping-set-drag-handle" title="Drag to reorder">
        <svg
          width="12"
          height="16"
          viewBox="0 0 12 16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="3" cy="4" r="1.5" />
          <circle cx="9" cy="4" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="12" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
        </svg>
      </div>

      {/* Type selector */}
      <select
        className="elb-mapping-set-type-select"
        value={valueType}
        onChange={handleTypeChange}
        aria-label={`Value ${index + 1} type`}
      >
        <option value="simple">Simple</option>
        <option value="advanced">Advanced</option>
      </select>

      {/* Value editor - conditional */}
      {valueType === 'simple' ? (
        <input
          type="text"
          className="elb-mapping-set-value-simple"
          value={entry.value as string}
          onChange={handleSimpleValueChange}
          placeholder="Key path or value (e.g., data.id)"
          aria-label={`Value ${index + 1}`}
        />
      ) : (
        <div className="elb-mapping-set-value-advanced">
          <MappingFormWrapper
            schema={valueConfigSchema}
            uiSchema={valueConfigUiSchema}
            formData={entry.value as Record<string, unknown>}
            onChange={handleAdvancedValueChange}
            nested={true}
          />
        </div>
      )}

      {/* Delete button */}
      <div className="elb-mapping-set-delete-wrapper">
        <IconButton
          icon="delete"
          variant="danger"
          onClick={onRemove}
          title={`Remove value ${index + 1}`}
        />
      </div>
    </div>
  );
}

import React from 'react';
import { IconButton } from './icon-button';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import {
  valueConfigSchema,
  valueConfigUiSchema,
} from '../../schemas/value-config-schema';
import { cleanFormData } from '../../utils/clean-form-data';

export interface MapEntry {
  key: string;
  value: string | Record<string, unknown>;
  tempId?: string;
}

export interface MappingMapEntryProps {
  entry: MapEntry;
  onChange: (entry: MapEntry) => void;
  onRemove: () => void;
  hasEmptyKey?: boolean;
  hasDuplicateKey?: boolean;
}

/**
 * MappingMapEntry - Single key-value entry in a map
 *
 * Features:
 * - Key input with validation warnings
 * - Type selector (Simple/Advanced)
 * - Simple mode: String input for key paths
 * - Advanced mode: Full ValueConfig form
 * - Delete button
 *
 * @example
 * <MappingMapEntry
 *   entry={{ key: 'item_id', value: 'data.id' }}
 *   onChange={handleChange}
 *   onRemove={handleRemove}
 * />
 */
export function MappingMapEntry({
  entry,
  onChange,
  onRemove,
  hasEmptyKey = false,
  hasDuplicateKey = false,
}: MappingMapEntryProps) {
  const valueType = typeof entry.value === 'string' ? 'simple' : 'advanced';

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...entry, key: e.target.value });
  };

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
      const extractedValue =
        (config.key as string) ||
        (typeof config.value === 'string' ? (config.value as string) : '') ||
        '';
      onChange({
        ...entry,
        value: extractedValue,
      });
    }
  };

  const handleSimpleValueChange = (value: string) => {
    onChange({ ...entry, value });
  };

  const handleAdvancedValueChange = (data: unknown) => {
    // Clean the nested ValueConfig data to remove empty values
    const cleaned = cleanFormData(data as Record<string, unknown>);
    const finalValue = Object.keys(cleaned).length > 0 ? cleaned : {};
    onChange({ ...entry, value: finalValue });
  };

  const keyClassName = `elb-mapping-map-key ${
    hasEmptyKey ? 'elb-mapping-map-key-empty' : ''
  } ${hasDuplicateKey ? 'elb-mapping-map-key-duplicate' : ''}`;

  return (
    <div
      className={`elb-mapping-map-entry ${
        valueType === 'advanced' ? 'elb-mapping-map-entry-advanced' : ''
      }`}
    >
      {/* Key input */}
      <input
        type="text"
        className={keyClassName}
        value={entry.key}
        onChange={handleKeyChange}
        placeholder="Key name"
        title={
          hasEmptyKey
            ? 'Key cannot be empty'
            : hasDuplicateKey
              ? 'Duplicate key'
              : undefined
        }
      />

      {/* Type selector */}
      <select
        className="elb-mapping-map-type-select"
        value={valueType}
        onChange={handleTypeChange}
      >
        <option value="simple">Simple</option>
        <option value="advanced">Advanced</option>
      </select>

      {/* Value editor - conditional */}
      {valueType === 'simple' ? (
        <input
          type="text"
          className="elb-mapping-map-value-simple"
          value={entry.value as string}
          onChange={(e) => handleSimpleValueChange(e.target.value)}
          placeholder="Key path (e.g., data.id)"
        />
      ) : (
        <div className="elb-mapping-map-value-advanced">
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
      <div className="elb-mapping-map-delete-wrapper">
        <IconButton
          icon="delete"
          variant="danger"
          onClick={onRemove}
          title="Remove entry"
        />
      </div>
    </div>
  );
}

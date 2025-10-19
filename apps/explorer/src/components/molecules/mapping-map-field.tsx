import React, { useState, useEffect } from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingMapEntry, MapEntry } from '../atoms/mapping-map-entry';
import { MappingCollapsible } from '../atoms/mapping-collapsible';
import { IconButton } from '../atoms/icon-button';

/**
 * MappingMapField - Custom field for object transformation mapping
 *
 * Manages a map of key-value pairs where values can be:
 * - Simple strings (key paths like 'data.id')
 * - Advanced ValueConfig objects (with key, value, condition, etc.)
 *
 * Features:
 * - Add/remove entries
 * - Edit key names
 * - Switch between simple and advanced value modes
 * - Warnings for empty/duplicate keys
 * - Recursive support (maps can contain maps)
 *
 * @example
 * // In schema:
 * map: {
 *   type: 'object',
 *   title: 'Map',
 *   description: 'Transform object properties',
 *   additionalProperties: true,
 * }
 *
 * // In uiSchema:
 * map: {
 *   'ui:field': 'mappingMap',
 * }
 */
export function MappingMapField(props: FieldProps) {
  const { formData, onChange, schema, uiSchema, disabled, readonly } = props;

  // Convert object to array for editing
  const objectToEntries = (
    obj: Record<string, unknown> | undefined,
  ): MapEntry[] => {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).map(([key, value]) => ({
      key,
      value: value as string | Record<string, unknown>,
    }));
  };

  // Convert array back to object
  const entriesToObject = (
    entries: MapEntry[],
  ): Record<string, unknown> | undefined => {
    // Filter out entries with empty keys
    const validEntries = entries.filter(
      (entry) => entry.key && entry.key.trim(),
    );

    if (validEntries.length === 0) return undefined;

    const result: Record<string, unknown> = {};
    validEntries.forEach((entry) => {
      result[entry.key] = entry.value;
    });
    return result;
  };

  const [entries, setEntries] = useState<MapEntry[]>(() =>
    objectToEntries(formData),
  );

  const hasEntries = entries.length > 0;

  // Start expanded if we have existing data
  const [isExpanded, setIsExpanded] = useState(hasEntries);

  // Sync external changes to internal state
  useEffect(() => {
    setEntries(objectToEntries(formData));
  }, [formData]);

  // Update expanded state when data changes (e.g., switching between mapping rules)
  useEffect(() => {
    setIsExpanded(hasEntries);
  }, [hasEntries]);

  // Track duplicate keys for warnings
  const duplicateKeys = new Set<string>();
  const keyCounts = new Map<string, number>();
  entries.forEach((entry) => {
    if (entry.key) {
      const count = (keyCounts.get(entry.key) || 0) + 1;
      keyCounts.set(entry.key, count);
      if (count > 1) {
        duplicateKeys.add(entry.key);
      }
    }
  });

  const handleEntriesChange = (newEntries: MapEntry[]) => {
    setEntries(newEntries);
    const obj = entriesToObject(newEntries);
    onChange(obj);
  };

  const handleEntryChange = (index: number, newEntry: MapEntry) => {
    const newEntries = [...entries];
    newEntries[index] = newEntry;
    handleEntriesChange(newEntries);
  };

  const handleEntryRemove = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    handleEntriesChange(newEntries);
  };

  const handleAddEntry = () => {
    const newEntry: MapEntry = {
      key: '',
      value: '',
      tempId: `temp-${Date.now()}-${Math.random()}`,
    };
    handleEntriesChange([...entries, newEntry]);
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const title = schema?.title || 'Map';
  const description = schema?.description || 'Transform object properties';

  return (
    <div className="elb-rjsf-widget">
      <MappingCollapsible
        mode="toggle"
        title={title}
        description={description}
        isExpanded={isExpanded}
        onToggle={setIsExpanded}
      >
        {hasEntries ? (
          <div className="elb-mapping-map-content">
            <div className="elb-mapping-map-entries">
              {entries.map((entry, index) => (
                <MappingMapEntry
                  key={entry.tempId || `entry-${index}`}
                  entry={entry}
                  onChange={(newEntry) => handleEntryChange(index, newEntry)}
                  onRemove={() => handleEntryRemove(index)}
                  hasEmptyKey={!entry.key || !entry.key.trim()}
                  hasDuplicateKey={
                    entry.key ? duplicateKeys.has(entry.key) : false
                  }
                />
              ))}
            </div>
            {!disabled && !readonly && (
              <IconButton
                icon="add"
                variant="default"
                onClick={handleAddEntry}
                className="elb-mapping-map-add-row-button"
              >
                Add key
              </IconButton>
            )}
          </div>
        ) : (
          !disabled &&
          !readonly && (
            <IconButton
              icon="add"
              variant="default"
              onClick={handleAddEntry}
              className="elb-mapping-map-add-button"
            >
              Add key-value pair
            </IconButton>
          )
        )}
      </MappingCollapsible>
    </div>
  );
}

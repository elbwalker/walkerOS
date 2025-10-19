import React, { useState, useEffect } from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingSetEntry, SetEntry } from '../atoms/mapping-set-entry';

/**
 * MappingSetField - Custom field for array of values
 *
 * Manages an array of values where each value can be:
 * - Simple strings (key paths like 'data.id')
 * - Advanced ValueConfig objects (with key, value, condition, etc.)
 *
 * Features:
 * - Add/remove entries
 * - Switch between simple and advanced value modes
 * - Recursive support (values can contain sets)
 *
 * @example
 * // In schema:
 * set: {
 *   type: 'array',
 *   title: 'Set',
 *   description: 'Array of static values',
 *   items: {
 *     oneOf: [
 *       { type: 'string' },
 *       { type: 'object' }
 *     ]
 *   }
 * }
 *
 * // In uiSchema:
 * set: {
 *   'ui:field': 'mappingSet',
 * }
 */
export function MappingSetField(props: FieldProps) {
  const { formData, onChange, schema, disabled, readonly } = props;

  // Convert array to entries with temp IDs for React keys
  const arrayToEntries = (
    arr: Array<string | Record<string, unknown>> | undefined,
  ): SetEntry[] => {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.map((value) => ({
      value,
      tempId: `set-${Date.now()}-${Math.random()}`,
    }));
  };

  // Convert entries back to array
  const entriesToArray = (
    entries: SetEntry[],
  ): Array<string | Record<string, unknown>> | undefined => {
    if (entries.length === 0) return undefined;
    return entries.map((entry) => entry.value);
  };

  const [entries, setEntries] = useState<SetEntry[]>(() =>
    arrayToEntries(formData),
  );

  // Sync external changes to internal state, preserving tempIds
  useEffect(() => {
    if (!formData || !Array.isArray(formData)) {
      if (entries.length > 0) {
        setEntries([]);
      }
      return;
    }

    // Check if formData actually changed (avoid re-sync from our own onChange)
    const currentValues = entriesToArray(entries);
    if (JSON.stringify(currentValues) === JSON.stringify(formData)) {
      return;
    }

    // Preserve existing tempIds when values match
    const newEntries = formData.map((value, index) => {
      const existingEntry = entries[index];
      if (
        existingEntry &&
        JSON.stringify(existingEntry.value) === JSON.stringify(value)
      ) {
        return existingEntry; // Preserve tempId
      }
      return {
        value,
        tempId: `set-${Date.now()}-${Math.random()}-${index}`,
      };
    });

    setEntries(newEntries);
  }, [formData]);

  const handleEntriesChange = (newEntries: SetEntry[]) => {
    setEntries(newEntries);
    const arr = entriesToArray(newEntries);
    onChange(arr);
  };

  const handleEntryChange = (index: number, newEntry: SetEntry) => {
    const newEntries = [...entries];
    newEntries[index] = newEntry;
    handleEntriesChange(newEntries);
  };

  const handleEntryRemove = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    handleEntriesChange(newEntries);
  };

  const handleAddEntry = () => {
    const newEntry: SetEntry = {
      value: '',
      tempId: `set-${Date.now()}-${Math.random()}`,
    };
    handleEntriesChange([...entries, newEntry]);
  };

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder array
    const newEntries = [...entries];
    const [removed] = newEntries.splice(dragIndex, 1);
    newEntries.splice(dropIndex, 0, removed);

    handleEntriesChange(newEntries);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const title = schema?.title || 'Set';
  const description = schema?.description || 'Array of static values';

  return (
    <div className="elb-mapping-set">
      {/* Header */}
      <div className="elb-mapping-set-header">
        <label className="elb-rjsf-label">{title}</label>
        {description && (
          <div className="elb-rjsf-description">{description}</div>
        )}
      </div>

      {/* Entries */}
      {entries.length > 0 && (
        <div className="elb-mapping-set-entries">
          {entries.map((entry, index) => (
            <div
              key={entry.tempId}
              draggable={!disabled && !readonly}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <MappingSetEntry
                entry={entry}
                onChange={(newEntry) => handleEntryChange(index, newEntry)}
                onRemove={() => handleEntryRemove(index)}
                index={index}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {!disabled && !readonly && (
        <button
          type="button"
          className="elb-mapping-set-add"
          onClick={handleAddEntry}
        >
          + Add Value
        </button>
      )}
    </div>
  );
}

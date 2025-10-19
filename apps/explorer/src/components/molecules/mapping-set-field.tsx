import React, { useState, useEffect, useRef } from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingSetEntry, SetEntry } from '../atoms/mapping-set-entry';
import { MappingCollapsible } from '../atoms/mapping-collapsible';
import { IconButton } from '../atoms/icon-button';

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

  const hasEntries = entries.length > 0;

  // Start expanded if we have existing data
  const [isExpanded, setIsExpanded] = useState(hasEntries);

  // Track previous formData to avoid redundant updates
  const prevFormDataRef = useRef<unknown>(formData);

  // Sync external changes to internal state, preserving tempIds
  useEffect(() => {
    // Only sync if formData actually changed from external source
    if (prevFormDataRef.current === formData) {
      return;
    }
    prevFormDataRef.current = formData;

    if (!formData || !Array.isArray(formData)) {
      if (entries.length > 0) {
        setEntries([]);
      }
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

  // Update expanded state when data changes (e.g., switching between mapping rules)
  useEffect(() => {
    setIsExpanded(hasEntries);
  }, [hasEntries]);

  const handleEntriesChange = (newEntries: SetEntry[]) => {
    setEntries(newEntries);
    const arr = entriesToArray(newEntries);

    // Update ref before calling onChange to prevent sync loop
    prevFormDataRef.current = arr;
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
    if (!isExpanded) {
      setIsExpanded(true);
    }
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
    <div className="elb-rjsf-widget">
      <MappingCollapsible
        mode="toggle"
        title={title}
        description={description}
        isExpanded={isExpanded}
        onToggle={setIsExpanded}
      >
        {hasEntries ? (
          <div className="elb-mapping-set-content">
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
            {!disabled && !readonly && (
              <IconButton
                icon="add"
                variant="default"
                onClick={handleAddEntry}
                className="elb-mapping-set-add-row-button"
              >
                Add value
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
              className="elb-mapping-set-add-button"
            >
              Add value
            </IconButton>
          )
        )}
      </MappingCollapsible>
    </div>
  );
}

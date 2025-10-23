import { useState } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingConfirmButton } from '../atoms/mapping-confirm-button';
import { getConfiguredProperties } from '../../utils/value-display-formatter';

export interface MappingSetPaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

/**
 * Set Pane View - Array of values
 *
 * Displays and manages an array of Value mappings.
 * Each value can be:
 * - Simple string (key path like 'data.id')
 * - ValueConfig object (key, fn, map, loop, etc.)
 *
 * Features:
 * - Drag-and-drop reordering
 * - Add/remove values
 * - Navigate to ValueTypePaneView for editing
 * - Show badges for configured properties
 *
 * @example
 * <MappingSetPaneView
 *   path={['product', 'view', 'data', 'items', 'set']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 * />
 */
export function MappingSetPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingSetPaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const setArray = Array.isArray(value) ? value : [];

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Get configured properties from a value (for badges)
  // Handlers
  const handleAdd = () => {
    const newArray = [...setArray, ''];
    const newIndex = newArray.length - 1;
    mappingState.actions.setValue(path, newArray);
    // Navigate to the new entry
    navigation.openTab([...path, newIndex.toString()], 'valueType');
  };

  const handleRowClick = (index: number) => {
    navigation.openTab([...path, index.toString()], 'valueType');
  };

  const handleDelete = (index: number) => {
    const newArray = setArray.filter((_, i) => i !== index);
    if (newArray.length === 0) {
      mappingState.actions.deleteValue(path);
    } else {
      mappingState.actions.setValue(path, newArray);
    }
  };

  // Drag-and-drop handlers
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
    const newArray = [...setArray];
    const [removed] = newArray.splice(dragIndex, 1);
    newArray.splice(dropIndex, 0, removed);

    mappingState.actions.setValue(path, newArray);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <BaseMappingPane
      title="Set Array"
      description="Array of values - each value is processed independently and all results are collected"
      navigation={navigation}
      className={className}
    >
      {/* Add button */}
      <div className="elb-set-input-section">
        <button
          type="button"
          className="elb-set-add-button"
          onClick={handleAdd}
        >
          + Add Value
        </button>
      </div>

      {/* Set entries list */}
      {setArray.length > 0 && (
        <div className="elb-set-list">
          {setArray.map((val, index) => {
            const configuredProps = getConfiguredProperties(val);
            const isSimple = typeof val === 'string';

            return (
              <div
                key={index}
                className={`elb-set-row ${
                  draggedIndex === index ? 'elb-set-row-dragging' : ''
                } ${dragOverIndex === index ? 'elb-set-row-drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {/* Drag handle */}
                <div className="elb-set-drag-handle" title="Drag to reorder">
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

                {/* Value display - clickable */}
                <div
                  className="elb-set-row-value"
                  onClick={() => handleRowClick(index)}
                >
                  <div className="elb-set-row-badges">
                    {isSimple ? (
                      <span className="elb-policy-badge">
                        <span className="elb-policy-badge-value">
                          "{val as string}"
                        </span>
                      </span>
                    ) : (
                      configuredProps.map(({ prop, value, isLong }) => (
                        <span key={prop} className="elb-policy-badge">
                          <span className="elb-policy-badge-label">
                            {prop}:
                          </span>
                          <span
                            className={`elb-policy-badge-value ${isLong ? 'is-long' : ''}`}
                          >
                            {value}
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="elb-set-row-actions">
                  <MappingConfirmButton
                    confirmLabel="Delete?"
                    onConfirm={() => handleDelete(index)}
                    ariaLabel={`Delete value ${index + 1}`}
                    className="elb-mapping-delete-button"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {setArray.length === 0 && (
        <div className="elb-set-empty">
          <p>No values in this set. Click "Add Value" to create one.</p>
          <p className="elb-set-empty-hint">
            Each value will be processed independently.
          </p>
        </div>
      )}
    </BaseMappingPane>
  );
}

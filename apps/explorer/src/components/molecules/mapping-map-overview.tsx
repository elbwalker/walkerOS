import React, { useState } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';

export interface MappingMapOverviewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  className?: string;
}

/**
 * Clean overview of map keys with navigation and add functionality
 * Shows tabs for existing keys + add button
 * Editor for currently selected key below
 */
export function MappingMapOverview({
  path,
  mappingState,
  className = '',
}: MappingMapOverviewProps) {
  const mapValue = mappingState.actions.getValue(path) as
    | Record<string, unknown>
    | undefined;
  const mapObj =
    ((typeof mapValue === 'object' && mapValue !== null && 'map' in mapValue
      ? mapValue.map
      : mapValue) as Record<string, unknown>) || {};

  const keys = Object.keys(mapObj);
  const [selectedKey, setSelectedKey] = useState<string>(keys[0] || '');
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const handleAddKey = () => {
    if (!newKeyName.trim()) return;

    // Add new key with empty string value
    const newMap = { ...mapObj, [newKeyName.trim()]: '' };
    mappingState.actions.setValue(path, { map: newMap });

    // Select the new key
    setSelectedKey(newKeyName.trim());
    setIsAddingKey(false);
    setNewKeyName('');
  };

  const handleDeleteKey = (keyToDelete: string) => {
    const newMap = { ...mapObj };
    delete newMap[keyToDelete];
    mappingState.actions.setValue(path, { map: newMap });

    // Select first remaining key
    const remainingKeys = Object.keys(newMap);
    setSelectedKey(remainingKeys[0] || '');
  };

  const handleKeyValueChange = (key: string, value: unknown) => {
    const newMap = { ...mapObj, [key]: value };
    mappingState.actions.setValue(path, { map: newMap });
  };

  const selectedValue = selectedKey ? mapObj[selectedKey] : undefined;

  return (
    <div className={`elb-mapping-map-overview ${className}`}>
      {/* Key tabs navigation */}
      <div className="elb-mapping-key-tabs">
        {keys.map((key) => (
          <button
            key={key}
            className={`elb-mapping-key-tab ${key === selectedKey ? 'is-active' : ''}`}
            onClick={() => setSelectedKey(key)}
            type="button"
          >
            {key}
            <button
              className="elb-mapping-key-tab-delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteKey(key);
              }}
              title="Delete key"
              type="button"
            >
              ×
            </button>
          </button>
        ))}

        {isAddingKey ? (
          <div className="elb-mapping-key-tab-add-form">
            <input
              type="text"
              className="elb-mapping-key-tab-add-input"
              placeholder="Key name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddKey();
                if (e.key === 'Escape') {
                  setIsAddingKey(false);
                  setNewKeyName('');
                }
              }}
              autoFocus
            />
            <button
              className="elb-mapping-key-tab-add-confirm"
              onClick={handleAddKey}
              type="button"
            >
              ✓
            </button>
            <button
              className="elb-mapping-key-tab-add-cancel"
              onClick={() => {
                setIsAddingKey(false);
                setNewKeyName('');
              }}
              type="button"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            className="elb-mapping-key-tab-add"
            onClick={() => setIsAddingKey(true)}
            type="button"
            title="Add key"
          >
            <span className="elb-mapping-key-tab-add-icon">+</span>
            <span className="elb-mapping-key-tab-add-text">Add</span>
          </button>
        )}
      </div>

      {/* Key editor */}
      {selectedKey && (
        <div className="elb-mapping-key-editor">
          <div className="elb-mapping-key-editor-header">
            <span className="elb-mapping-key-editor-label">{selectedKey}</span>
          </div>
          <div className="elb-mapping-key-editor-content">
            {/* Simple value editor for now - will be replaced with type selector */}
            <input
              type="text"
              className="elb-mapping-key-editor-input"
              value={
                typeof selectedValue === 'string'
                  ? selectedValue
                  : JSON.stringify(selectedValue)
              }
              onChange={(e) =>
                handleKeyValueChange(selectedKey, e.target.value)
              }
              placeholder="Enter value or path (e.g., data.id)"
            />
          </div>
        </div>
      )}

      {keys.length === 0 && !isAddingKey && (
        <div className="elb-mapping-map-empty">
          <p>No keys defined</p>
          <button
            className="elb-mapping-map-empty-add"
            onClick={() => setIsAddingKey(true)}
            type="button"
          >
            + Add first key
          </button>
        </div>
      )}
    </div>
  );
}

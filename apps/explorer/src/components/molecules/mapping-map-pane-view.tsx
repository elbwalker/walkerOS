import { useState, useEffect, useRef } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingInputWithButton } from '../atoms/mapping-input-with-button';
import { MappingConfirmButton } from '../atoms/mapping-confirm-button';
import { getConfiguredProperties } from '../../utils/value-display-formatter';

/**
 * Map Pane View - Overview of key-value mappings
 *
 * Shows all map keys as a list with badges for configured properties.
 * Map is an object where each key maps to a Value (string | ValueConfig).
 *
 * Features:
 * - Add new key-value pairs
 * - View configured properties as badges
 * - Navigate to individual key editors (ValueType pane)
 * - Delete keys
 *
 * Structure: { [key: string]: Value }
 *
 * @example
 * <MappingMapPaneView
 *   path={['product', 'view', 'data', 'map']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 * />
 */
export interface MappingMapPaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

export function MappingMapPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingMapPaneViewProps) {
  const [newKey, setNewKey] = useState('');
  const [keyExists, setKeyExists] = useState(false);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Get map from the current path
  const mapValue = mappingState.actions.getValue(path);
  const map =
    mapValue && typeof mapValue === 'object' && !Array.isArray(mapValue)
      ? (mapValue as Record<string, unknown>)
      : {};

  // Get sorted list of map keys
  const mapKeys = Object.keys(map).sort();

  const handleKeyInputChange = (value: string) => {
    setNewKey(value);
    setKeyExists(map[value] !== undefined);
  };

  const handleKeySubmit = () => {
    const key = newKey.trim();
    if (!key) {
      setNewKey('');
      return;
    }

    // Navigate to the key (creates path in navigation)
    // Initialize with empty string if new
    if (!keyExists) {
      mappingState.actions.setValue([...path, key], '');
    }
    navigation.openTab([...path, key], 'valueType');

    setNewKey('');
    setKeyExists(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setNewKey('');
      setKeyExists(false);
    }
  };

  const handleKeyClick = (key: string) => {
    navigation.openTab([...path, key], 'valueType');
  };

  const handleBadgeClick = (key: string, prop: string) => {
    // Map badge property to specific pane type
    // If prop is empty (simple string value), go to valueType overview
    if (!prop) {
      navigation.openTab([...path, key], 'valueType');
      return;
    }

    // Map each property to its corresponding node type and path
    const propToNodeType: Record<string, string> = {
      fn: 'fn',
      key: 'valueConfig', // Navigate to valueConfig editor for key property
      value: 'value',
      map: 'map',
      loop: 'loop',
      set: 'set',
      consent: 'consent',
      condition: 'condition',
      validate: 'validate',
    };

    const nodeType = propToNodeType[prop] || 'valueType';
    // All properties navigate to [...path, key, prop]
    const targetPath = [...path, key, prop];

    navigation.openTab(targetPath, nodeType as any);
  };

  const handleDeleteClick = (key: string) => {
    mappingState.actions.deleteValue([...path, key]);
  };

  const handleRenameClick = (key: string) => {
    setRenamingKey(key);
    setRenameValue(key);
  };

  const handleRenameChange = (value: string) => {
    setRenameValue(value);
  };

  const handleRenameSubmit = (oldKey: string) => {
    const newKeyTrimmed = renameValue.trim();

    // Cancel if empty or unchanged
    if (!newKeyTrimmed || newKeyTrimmed === oldKey) {
      setRenamingKey(null);
      setRenameValue('');
      return;
    }

    // Cancel if key already exists
    if (map[newKeyTrimmed] !== undefined) {
      setRenamingKey(null);
      setRenameValue('');
      return;
    }

    // Rename: copy value to new key, delete old key
    const value = map[oldKey];
    const newMap = { ...map };
    delete newMap[oldKey];
    newMap[newKeyTrimmed] = value;

    mappingState.actions.setValue(path, newMap);
    setRenamingKey(null);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setRenamingKey(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, oldKey: string) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  const handleRenameBlur = () => {
    // Cancel edit on blur (clicking outside)
    // Use setTimeout to allow button click to register first
    setTimeout(() => {
      handleRenameCancel();
    }, 150);
  };

  // Determine which properties are configured for a value
  return (
    <BaseMappingPane
      title="Map"
      description={
        mapKeys.length === 0
          ? 'No keys yet. Add keys to transform event data.'
          : `${mapKeys.length} ${mapKeys.length === 1 ? 'key' : 'keys'}`
      }
      navigation={navigation}
      className={className}
    >
      {/* Add new key input */}
      <div className="elb-policy-input-section">
        <MappingInputWithButton
          value={newKey}
          onChange={handleKeyInputChange}
          onSubmit={handleKeySubmit}
          onKeyDown={handleKeyDown}
          buttonLabel={keyExists ? 'Open' : 'Add Key'}
          showButton={true}
          placeholder="Type key name to create or select (e.g., currency)..."
          className={keyExists ? 'is-existing' : ''}
        />
      </div>

      {/* Map keys list */}
      {mapKeys.length > 0 && (
        <div className="elb-policy-list">
          {mapKeys.map((key) => {
            const value = map[key];
            const configuredProps = getConfiguredProperties(value);

            const isRenaming = renamingKey === key;

            return (
              <div
                key={key}
                className="elb-policy-row"
                onClick={() => !isRenaming && handleKeyClick(key)}
                style={{ cursor: isRenaming ? 'default' : 'pointer' }}
              >
                {/* First column: Key + Edit icon */}
                {isRenaming ? (
                  <div className="elb-policy-row-path-rename">
                    <MappingInputWithButton
                      value={renameValue}
                      onChange={handleRenameChange}
                      onSubmit={() => handleRenameSubmit(key)}
                      onKeyDown={(e) => handleRenameKeyDown(e, key)}
                      onBlur={handleRenameBlur}
                      buttonLabel="Save"
                      showButton={true}
                      autoFocus
                      className=""
                    />
                  </div>
                ) : (
                  <div className="elb-policy-row-path-with-edit">
                    <span className="elb-policy-row-path">{key}</span>
                    <button
                      type="button"
                      className="elb-mapping-edit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameClick(key);
                      }}
                      title="Rename key"
                      aria-label={`Rename key ${key}`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 3L11 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Second column: Badges */}
                <div className="elb-policy-row-badges">
                  {configuredProps.map(({ prop, value, isLong }, index) => (
                    <button
                      key={prop || index}
                      type="button"
                      className="elb-policy-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBadgeClick(key, prop);
                      }}
                      title={
                        prop
                          ? `Click to edit ${prop}`
                          : 'Click to edit value configuration'
                      }
                    >
                      {prop && (
                        <span className="elb-policy-badge-label">{prop}:</span>
                      )}
                      <span
                        className={`elb-policy-badge-value ${isLong ? 'is-long' : ''}`}
                      >
                        {value}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Third column: Actions */}
                <div className="elb-policy-row-actions">
                  <MappingConfirmButton
                    confirmLabel="Delete?"
                    onConfirm={() => handleDeleteClick(key)}
                    ariaLabel={`Delete key ${key}`}
                    className="elb-mapping-delete-button"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {mapKeys.length === 0 && (
        <div className="elb-policy-empty">
          <p>Map transforms event data by mapping keys to values.</p>
          <ul>
            <li>Each key becomes a property in the output</li>
            <li>Values can be simple strings or complex transformations</li>
            <li>Example: currency → "USD", item_id → "data.id"</li>
          </ul>
        </div>
      )}
    </BaseMappingPane>
  );
}

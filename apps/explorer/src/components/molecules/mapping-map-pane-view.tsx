import { useState } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { PaneHeader } from '../atoms/pane-header';
import { MappingInput } from '../atoms/mapping-input';
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
    if (e.key === 'Enter') {
      handleKeySubmit();
    } else if (e.key === 'Escape') {
      setNewKey('');
      setKeyExists(false);
    }
  };

  const handleKeyBlur = () => {
    setTimeout(() => {
      handleKeySubmit();
    }, 150);
  };

  const handleKeyClick = (key: string) => {
    navigation.openTab([...path, key], 'valueType');
  };

  const handleBadgeClick = (key: string) => {
    // Navigate to the ValueType pane
    navigation.openTab([...path, key], 'valueType');
  };

  const handleDeleteClick = (key: string) => {
    mappingState.actions.deleteValue([...path, key]);
  };

  // Determine which properties are configured for a value
  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <PaneHeader
          title="Map"
          description={
            mapKeys.length === 0
              ? 'No keys yet. Add keys to transform event data.'
              : `${mapKeys.length} ${mapKeys.length === 1 ? 'key' : 'keys'}`
          }
          onBack={navigation.goBack}
          canGoBack={navigation.canGoBack()}
        />

        {/* Add new key input */}
        <div className="elb-policy-input-section">
          <MappingInput
            value={newKey}
            onChange={handleKeyInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleKeyBlur}
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

              return (
                <div key={key} className="elb-policy-row">
                  {/* Key */}
                  <button
                    type="button"
                    className="elb-policy-row-path"
                    onClick={() => handleKeyClick(key)}
                    title="Click to edit this mapping"
                  >
                    {key}
                  </button>

                  {/* Badges */}
                  <div className="elb-policy-row-badges">
                    {configuredProps.map(({ prop, value, isLong }, index) => (
                      <button
                        key={prop || index}
                        type="button"
                        className="elb-policy-badge"
                        onClick={() => handleBadgeClick(key)}
                        title={prop ? `${prop}: ${value}` : value}
                      >
                        {prop && (
                          <span className="elb-policy-badge-label">
                            {prop}:
                          </span>
                        )}
                        <span
                          className={`elb-policy-badge-value ${isLong ? 'is-long' : ''}`}
                        >
                          {value}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
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
      </div>
    </div>
  );
}

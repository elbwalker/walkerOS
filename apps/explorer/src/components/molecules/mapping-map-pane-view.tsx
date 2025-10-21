import type { MappingState } from '../../hooks/useMappingState';
import type { MappingNavigation } from '../../hooks/useMappingNavigation';

/**
 * Map Pane View - Pure Presentation Component
 *
 * Edits map object transformations:
 * {
 *   map: {
 *     key1: 'value1',
 *     key2: { map: {...} },
 *     key3: { loop: [...] }
 *   }
 * }
 *
 * Displays as a table with inline editing for simple values.
 * Complex values (nested map/loop) get "Open in Tab" buttons.
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
  mappingState: MappingState;
  navigation: MappingNavigation;
  className?: string;
}

export function MappingMapPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingMapPaneViewProps) {
  // Get current map value
  const mapValue = mappingState.actions.getValue(path) as
    | Record<string, unknown>
    | undefined;

  if (!mapValue || typeof mapValue !== 'object') {
    return (
      <div className={`elb-mapping-pane elb-mapping-map-pane ${className}`}>
        <div className="elb-mapping-pane-error">
          Invalid map configuration at path: {path.join(' > ')}
        </div>
      </div>
    );
  }

  const entries = Object.entries(mapValue);
  const pathLabel = path[path.length - 1] || 'Map';

  // Check if value is simple (string) or complex (object)
  const isSimpleValue = (value: unknown): boolean => {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  };

  // Get type label for complex values
  const getValueType = (value: unknown): string => {
    if (typeof value !== 'object' || value === null) return 'string';
    if ('map' in value) return 'map';
    if ('loop' in value) return 'loop';
    if ('fn' in value) return 'function';
    if ('key' in value) return 'key';
    if ('value' in value) return 'value';
    if ('set' in value) return 'set';
    return 'object';
  };

  // Handlers
  const handleAddEntry = () => {
    const newKey = `new_key_${Date.now()}`;
    mappingState.actions.setValue([...path, newKey], '');
  };

  const handleDeleteEntry = (key: string) => {
    mappingState.actions.deleteValue([...path, key]);
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;

    // Check if new key already exists
    if (mapValue[newKey] !== undefined) {
      alert(`Key "${newKey}" already exists`);
      return;
    }

    // Copy value to new key and delete old key
    const value = mapValue[oldKey];
    mappingState.actions.setValue([...path, newKey], value);
    mappingState.actions.deleteValue([...path, oldKey]);
  };

  const handleSimpleValueChange = (key: string, value: string) => {
    mappingState.actions.setValue([...path, key], value);
  };

  const handleOpenInTab = (key: string, value: unknown) => {
    const valueType = getValueType(value);
    const nodeType: 'map' | 'loop' | 'valueConfig' =
      valueType === 'map'
        ? 'map'
        : valueType === 'loop'
          ? 'loop'
          : 'valueConfig';
    navigation.openTab([...path, key], nodeType);
  };

  return (
    <div className={`elb-mapping-pane elb-mapping-map-pane ${className}`}>
      {/* Pane Header */}
      <div className="elb-mapping-pane-header">
        <h3 className="elb-mapping-pane-title">{pathLabel}</h3>
        <span className="elb-mapping-pane-type">
          Map Object ({entries.length} keys)
        </span>
      </div>

      {/* Pane Content */}
      <div className="elb-mapping-pane-content">
        {entries.length === 0 ? (
          <div className="elb-mapping-pane-empty">
            No entries in this map. Click "Add Entry" to create one.
          </div>
        ) : (
          <div className="elb-mapping-map-table">
            <table className="elb-mapping-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([key, value]) => {
                  const simple = isSimpleValue(value);
                  const valueType = getValueType(value);

                  return (
                    <tr key={key}>
                      {/* Key Column */}
                      <td className="elb-mapping-table-key">
                        <input
                          type="text"
                          className="elb-mapping-pane-input elb-mapping-pane-input--inline"
                          value={key}
                          onChange={(e) => handleKeyChange(key, e.target.value)}
                          onBlur={(e) => {
                            if (!e.target.value.trim()) {
                              handleDeleteEntry(key);
                            }
                          }}
                        />
                      </td>

                      {/* Value Column */}
                      <td className="elb-mapping-table-value">
                        {simple ? (
                          <input
                            type="text"
                            className="elb-mapping-pane-input elb-mapping-pane-input--inline"
                            value={String(value)}
                            onChange={(e) =>
                              handleSimpleValueChange(key, e.target.value)
                            }
                            placeholder="data.property"
                          />
                        ) : (
                          <div className="elb-mapping-table-complex">
                            <span className="elb-mapping-table-type-badge">
                              {valueType}
                            </span>
                            <button
                              type="button"
                              className="elb-mapping-pane-button elb-mapping-pane-button--small"
                              onClick={() => handleOpenInTab(key, value)}
                            >
                              Open in Tab →
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="elb-mapping-table-actions">
                        <button
                          type="button"
                          className="elb-mapping-pane-button elb-mapping-pane-button--danger elb-mapping-pane-button--small"
                          onClick={() => handleDeleteEntry(key)}
                          title="Delete entry"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Entry Button */}
        <div className="elb-mapping-pane-actions">
          <button
            type="button"
            className="elb-mapping-pane-button elb-mapping-pane-button--primary"
            onClick={handleAddEntry}
          >
            + Add Entry
          </button>
        </div>
      </div>
    </div>
  );
}

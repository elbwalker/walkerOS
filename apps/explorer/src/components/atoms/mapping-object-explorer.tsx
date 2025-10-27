import { useState } from 'react';
import type { WidgetProps, RJSFSchema } from '@rjsf/utils';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type {
  UseMappingNavigationReturn,
  NodeType,
} from '../../hooks/useMappingNavigation';
import { MappingInputWithButton } from './mapping-input-with-button';
import { MappingConfirmButton } from './mapping-confirm-button';
import { getConfiguredProperties } from '../../utils/value-display-formatter';
import { PropertySuggestions } from '../molecules/property-suggestions';

/**
 * Form context interface for object explorer widget
 */
export interface ObjectExplorerFormContext {
  navigation: UseMappingNavigationReturn;
  mappingState: UseMappingStateReturn;
  path: string[];
}

/**
 * Configuration options from uiSchema
 */
export interface ObjectExplorerOptions {
  allowAdd?: boolean; // Allow adding new keys (default: true)
  allowRename?: boolean; // Allow renaming keys (default: true)
  allowDelete?: boolean; // Allow deleting keys (default: true)
  showBadges?: boolean; // Show property badges (default: true)
  childNodeType?: NodeType; // Node type for child navigation (default: 'valueType')
  emptyMessage?: string; // Empty state message
  placeholder?: string; // Input placeholder text
  propertySuggestionsSchema?: RJSFSchema; // Schema for property suggestions
}

/**
 * MappingObjectExplorerWidget - Generic RJSF widget for object key-value exploration
 *
 * Replicates the exact behavior of MappingMapPaneView but is schema-driven.
 * Can be reused for map transformations, settings navigation, and any nested object exploration.
 *
 * Features (identical to original map pane):
 * - List object keys sorted alphabetically
 * - Add new key with input + button
 * - Rename key inline with edit icon
 * - Delete key with confirm button
 * - Show badges for configured properties
 * - Navigate to child editor on click
 * - Navigate to specific property on badge click
 *
 * Configuration via uiSchema:
 * ```typescript
 * {
 *   'ui:widget': 'objectExplorer',
 *   'ui:options': {
 *     allowAdd: true,
 *     allowRename: true,
 *     allowDelete: true,
 *     showBadges: true,
 *     childNodeType: 'valueType',
 *     emptyMessage: 'No keys yet...',
 *     placeholder: 'Type key name...'
 *   }
 * }
 * ```
 *
 * Requires formContext with navigation, mappingState, and path.
 */
export function MappingObjectExplorerWidget(props: WidgetProps) {
  const { value, onChange, options, formContext } = props;

  // Extract context
  const { navigation, mappingState, path } = (formContext ||
    {}) as ObjectExplorerFormContext;

  // Extract options with defaults
  const config: Required<
    Omit<ObjectExplorerOptions, 'propertySuggestionsSchema'>
  > & { propertySuggestionsSchema?: RJSFSchema } = {
    allowAdd: options?.allowAdd !== false,
    allowRename: options?.allowRename !== false,
    allowDelete: options?.allowDelete !== false,
    showBadges: options?.showBadges !== false,
    childNodeType: (options?.childNodeType as NodeType) || 'valueType',
    emptyMessage:
      options?.emptyMessage || 'No keys yet. Add keys to transform event data.',
    placeholder:
      options?.placeholder ||
      'Type key name to create or select (e.g., currency)...',
    propertySuggestionsSchema: options?.propertySuggestionsSchema as
      | RJSFSchema
      | undefined,
  };

  // State for add/rename operations
  const [newKey, setNewKey] = useState('');
  const [keyExists, setKeyExists] = useState(false);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Get map object from value
  const map =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  // Get sorted list of map keys
  const mapKeys = Object.keys(map).sort();

  // Add key handlers
  const handleKeyInputChange = (newValue: string) => {
    setNewKey(newValue);
    setKeyExists(map[newValue] !== undefined);
  };

  const handleKeySubmit = () => {
    const key = newKey.trim();
    if (!key) {
      setNewKey('');
      return;
    }

    // Initialize with empty string if new
    if (!keyExists) {
      const newMap = { ...map, [key]: '' };
      onChange(newMap);
    }

    // Navigate to the key editor
    if (navigation) {
      navigation.openTab([...path, key], config.childNodeType);
    }

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

  // Key click handler - navigate to child editor
  const handleKeyClick = (key: string) => {
    if (navigation) {
      navigation.openTab([...path, key], config.childNodeType);
    }
  };

  // Badge click handler - navigate to specific property
  const handleBadgeClick = (key: string, prop: string) => {
    if (!navigation) return;

    // If prop is empty (simple string value), go to child overview
    if (!prop) {
      navigation.openTab([...path, key], config.childNodeType);
      return;
    }

    // Map each property to its corresponding node type and path
    const propToNodeType: Record<string, string> = {
      fn: 'fn',
      key: 'key',
      value: 'value',
      map: 'map',
      loop: 'loop',
      set: 'set',
      consent: 'consent',
      condition: 'condition',
      validate: 'validate',
    };

    const nodeType = propToNodeType[prop] || config.childNodeType;
    const targetPath = [...path, key, prop];

    navigation.openTab(targetPath, nodeType as NodeType);
  };

  // Delete key handler
  const handleDeleteClick = (key: string) => {
    const newMap = { ...map };
    delete newMap[key];
    onChange(newMap);
  };

  // Rename handlers
  const handleRenameClick = (key: string) => {
    setRenamingKey(key);
    setRenameValue(key);
  };

  const handleRenameChange = (newValue: string) => {
    setRenameValue(newValue);
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
    const oldValue = map[oldKey];
    const newMap = { ...map };
    delete newMap[oldKey];
    newMap[newKeyTrimmed] = oldValue;

    onChange(newMap);
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

  // Property suggestion selection handler
  const handlePropertySelect = (propertyName: string, nodeType: NodeType) => {
    // Initialize with empty string if new
    if (map[propertyName] === undefined) {
      const newMap = { ...map, [propertyName]: '' };
      onChange(newMap);
    }

    // Navigate to the property editor using the schema-detected NodeType
    if (navigation) {
      navigation.openTab([...path, propertyName], nodeType);
    }
  };

  return (
    <div className="elb-object-explorer">
      {/* Add new key input */}
      {config.allowAdd && (
        <div className="elb-policy-input-section">
          <MappingInputWithButton
            value={newKey}
            onChange={handleKeyInputChange}
            onSubmit={handleKeySubmit}
            onKeyDown={handleKeyDown}
            buttonLabel={keyExists ? 'Open' : 'Add Key'}
            showButton={true}
            placeholder={config.placeholder}
            className={keyExists ? 'is-existing' : ''}
          />
        </div>
      )}

      {/* Property suggestions from schema */}
      {config.allowAdd &&
        config.propertySuggestionsSchema &&
        typeof config.propertySuggestionsSchema === 'object' &&
        'properties' in config.propertySuggestionsSchema && (
          <PropertySuggestions
            schema={config.propertySuggestionsSchema}
            existingKeys={mapKeys}
            currentValue={map}
            onSelect={handlePropertySelect}
          />
        )}

      {/* Map keys list */}
      {mapKeys.length > 0 && (
        <div className="elb-policy-list">
          {mapKeys.map((key) => {
            const keyValue = map[key];
            const configuredProps = config.showBadges
              ? getConfiguredProperties(keyValue)
              : [];

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
                    {config.allowRename && (
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
                    )}
                  </div>
                )}

                {/* Second column: Badges */}
                {config.showBadges && (
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
                )}

                {/* Third column: Actions */}
                {config.allowDelete && (
                  <div className="elb-policy-row-actions">
                    <MappingConfirmButton
                      confirmLabel="Delete?"
                      onConfirm={() => handleDeleteClick(key)}
                      ariaLabel={`Delete key ${key}`}
                      className="elb-mapping-delete-button"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {mapKeys.length === 0 && (
        <div className="elb-policy-empty">
          <p>{config.emptyMessage}</p>
          <ul>
            <li>Each key becomes a property in the output</li>
            <li>Values can be simple strings or complex transformations</li>
            <li>Example: currency → "USD", item_id → "data.id"</li>
          </ul>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import type { UseMappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';
import { PaneHeader } from '../atoms/pane-header';
import { ConfigTile, type ConfigTileStatus } from '../atoms/config-tile';
import { MappingInput } from '../atoms/mapping-input';

export interface MappingValueTypePaneViewProps {
  path: string[];
  mappingState: UseMappingState;
  navigation: UseMappingNavigation;
  className?: string;
}

interface ValueConfigTileConfig {
  key: string;
  label: string;
  description: string;
}

const VALUE_CONFIG_TILES: ValueConfigTileConfig[] = [
  {
    key: 'key',
    label: 'Key',
    description: 'Property path',
  },
  {
    key: 'value',
    label: 'Value',
    description: 'Static value',
  },
  {
    key: 'fn',
    label: 'Fn',
    description: 'Custom function',
  },
  {
    key: 'map',
    label: 'Map',
    description: 'Transform object',
  },
  {
    key: 'loop',
    label: 'Loop',
    description: 'Array iteration',
  },
  {
    key: 'set',
    label: 'Set',
    description: 'Multiple values',
  },
  {
    key: 'consent',
    label: 'Consent',
    description: 'Required states',
  },
  {
    key: 'validate',
    label: 'Validate',
    description: 'Check function',
  },
];

/**
 * ValueType Pane - Edit ValueType (string | ValueConfig)
 *
 * Two modes:
 * 1. Simple String Mode - User types a value directly
 * 2. ValueConfig Mode - User selects advanced configuration tiles
 *
 * Smart Sync:
 * - When in ValueConfig mode with only 'key' set, input shows key value
 * - Input becomes disabled when ValueConfig is active
 * - Clicking disabled input (with only key) converts back to string
 */
export function MappingValueTypePaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingValueTypePaneViewProps) {
  const value = mappingState.actions.getValue(path);

  // Determine current mode
  const isString = typeof value === 'string';
  const isValueConfig = typeof value === 'object' && value !== null;
  const valueConfig = isValueConfig ? (value as Record<string, unknown>) : {};

  // Check if only 'key' is set (eligible for easy conversion back to string)
  const isOnlyKey =
    isValueConfig &&
    Object.keys(valueConfig).length === 1 &&
    'key' in valueConfig;

  // Display value for the input
  // - If simple string: use the string value
  // - If ValueConfig with only 'key': show the key value (disabled)
  // - If ValueConfig with other props: show empty (disabled)
  const displayValue = isString
    ? (value as string)
    : isOnlyKey
      ? String(valueConfig.key)
      : '';

  const handleStringChange = (newValue: string) => {
    // Only allow changes when NOT in ValueConfig mode
    if (!isValueConfig) {
      mappingState.actions.setValue(path, newValue);
    }
  };

  const handleInputClick = () => {
    // If only 'key' is set, convert back to simple string
    if (isOnlyKey) {
      mappingState.actions.setValue(path, displayValue);
    }
  };

  const handleTileClick = (tileKey: string) => {
    if (tileKey === 'key') {
      // Special case: 'key' - convert string to ValueConfig with key
      if (isString) {
        mappingState.actions.setValue(path, { key: displayValue || '' });
      } else if (isOnlyKey) {
        // Already has key, navigate to edit it
        navigation.openTab([...path, 'key'], 'key');
      } else {
        // Has other ValueConfig properties, navigate to key
        navigation.openTab([...path, 'key'], 'key');
      }
    } else {
      // Other tiles - navigate to their respective panes
      // For now, use placeholder for unimplemented panes
      navigation.openTab([...path, tileKey], 'valueConfig');
    }
  };

  const getTileStatus = (tileKey: string): ConfigTileStatus => {
    if (!isValueConfig) {
      return { enabled: false, text: 'Not set' };
    }

    const configValue = valueConfig[tileKey];

    switch (tileKey) {
      case 'key':
        return typeof configValue === 'string' && configValue
          ? { enabled: true, text: configValue }
          : { enabled: false, text: 'Not set' };

      case 'value':
        return configValue !== undefined
          ? {
              enabled: true,
              text:
                typeof configValue === 'string'
                  ? configValue
                  : typeof configValue === 'number'
                    ? String(configValue)
                    : typeof configValue === 'boolean'
                      ? String(configValue)
                      : 'Set',
            }
          : { enabled: false, text: 'Not set' };

      case 'fn':
        return typeof configValue === 'string' && configValue
          ? { enabled: true, text: 'Active' }
          : { enabled: false, text: 'Not set' };

      case 'map':
        if (!configValue) return { enabled: false, text: 'Not set' };
        const mapCount = Object.keys(
          configValue as Record<string, unknown>,
        ).length;
        return mapCount > 0
          ? {
              enabled: true,
              text: `${mapCount} ${mapCount === 1 ? 'property' : 'properties'}`,
            }
          : { enabled: false, text: 'Not set' };

      case 'loop':
        return Array.isArray(configValue) && configValue.length === 2
          ? { enabled: true, text: 'Active' }
          : { enabled: false, text: 'Not set' };

      case 'set':
        return Array.isArray(configValue) && configValue.length > 0
          ? {
              enabled: true,
              text: `${configValue.length} ${configValue.length === 1 ? 'value' : 'values'}`,
            }
          : { enabled: false, text: 'Not set' };

      case 'consent':
        if (!configValue) return { enabled: false, text: 'Not set' };
        const consentCount = Object.keys(
          configValue as Record<string, unknown>,
        ).length;
        return consentCount > 0
          ? {
              enabled: true,
              text: `${consentCount} ${consentCount === 1 ? 'state' : 'states'}`,
            }
          : { enabled: false, text: 'Not set' };

      case 'validate':
        return typeof configValue === 'string' && configValue
          ? { enabled: true, text: 'Active' }
          : { enabled: false, text: 'Not set' };

      default:
        return { enabled: false, text: 'Not set' };
    }
  };

  const isInputDisabled = isValueConfig;
  const inputPlaceholder = isInputDisabled
    ? 'Using advanced configuration'
    : 'Type property path or static value';
  const inputTitle = isOnlyKey
    ? 'Click to convert back to simple string'
    : isInputDisabled
      ? 'Disabled - using ValueConfig'
      : 'Enter a simple string value';

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <PaneHeader
          title="Value Configuration"
          description="Configure how this value is resolved"
        />

        {/* Quick Value Section */}
        <div className="elb-mapping-value-type-quick-section">
          <div className="elb-mapping-value-type-section-title">
            Quick Value (String)
          </div>
          <MappingInput
            value={displayValue}
            onChange={handleStringChange}
            onClick={handleInputClick}
            disabled={isInputDisabled && !isOnlyKey}
            placeholder={inputPlaceholder}
            title={inputTitle}
            className={isOnlyKey ? 'is-convertible' : ''}
          />
          <div className="elb-mapping-value-type-hint">
            {isOnlyKey ? (
              <span className="is-info">
                Click input to convert back to simple string
              </span>
            ) : isInputDisabled ? (
              <span>Using advanced configuration below</span>
            ) : (
              <span>Type a property path or static value</span>
            )}
          </div>
        </div>

        {/* Advanced Configuration Section */}
        <div className="elb-mapping-value-type-advanced-section">
          <div className="elb-mapping-value-type-section-title">
            Advanced Configuration (ValueConfig)
          </div>
          <div className="elb-mapping-value-type-tiles-grid">
            {VALUE_CONFIG_TILES.map((tile) => (
              <ConfigTile
                key={tile.key}
                label={tile.label}
                description={tile.description}
                status={getTileStatus(tile.key)}
                onClick={() => handleTileClick(tile.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

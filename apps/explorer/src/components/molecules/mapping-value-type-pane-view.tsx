import { useState, useEffect } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { PaneHeader } from '../atoms/pane-header';
import { ConfigTile, type ConfigTileStatus } from '../atoms/config-tile';
import { MappingInput } from '../atoms/mapping-input';

export interface MappingValueTypePaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
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
 * Simple logic:
 * - String mode: Quick Value input edits the string directly
 * - Object mode: Quick Value input ALWAYS edits the 'key' property
 * - Input is NEVER disabled
 * - Quick Value and Key tile are always synced
 *
 * Smart Conversions:
 * - Clicking any tile in String mode converts to { key: "string value" }
 * - All tiles (including Key) are clickable and open their respective editors
 * - Conversion happens automatically before opening the editor
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

  // Display value for the input
  // - If string: show the string value
  // - If object: show the key property value (or empty if no key)
  const displayValue = isString
    ? (value as string)
    : typeof valueConfig.key === 'string'
      ? valueConfig.key
      : '';

  const handleStringChange = (newValue: string) => {
    if (isString || value === undefined) {
      // String mode or undefined: set as string value
      mappingState.actions.setValue(path, newValue);
    } else if (isValueConfig) {
      // ValueConfig mode: update the key property using the sub-path
      // This works whether it's key-only or has multiple properties
      mappingState.actions.setValue([...path, 'key'], newValue);
    }
  };

  const handleTileClick = (tileKey: string) => {
    // If in string mode, convert to ValueConfig first (for all tiles)
    // This preserves the string value as the 'key' property
    if (isString && displayValue) {
      mappingState.actions.setValue(path, { key: displayValue });
    } else if (value === undefined) {
      // If value is undefined, initialize as empty object so tile properties can be set
      mappingState.actions.setValue(path, {});
    }

    // Determine the appropriate nodeType based on the property
    // Properties that hold primitives get dedicated editors
    // Properties that hold ValueConfig objects get the generic valueConfig editor
    let nodeType: string;
    switch (tileKey) {
      case 'key':
        nodeType = 'valueConfig'; // Key is a string, use valueConfig editor in 'key' mode
        break;
      case 'value':
        nodeType = 'value'; // Primitive value editor
        break;
      case 'fn':
        nodeType = 'fn'; // Function editor (placeholder for now)
        break;
      case 'validate':
        nodeType = 'validate'; // Validate function editor (placeholder for now)
        break;
      case 'condition':
        nodeType = 'condition'; // Condition function editor (already implemented)
        break;
      case 'consent':
        nodeType = 'consent'; // Consent editor (already implemented)
        break;
      case 'map':
        nodeType = 'map'; // Map editor (placeholder for now)
        break;
      case 'loop':
        nodeType = 'loop'; // Loop editor (placeholder for now)
        break;
      case 'set':
        nodeType = 'set'; // Set editor (placeholder for now)
        break;
      default:
        nodeType = 'valueConfig'; // Fallback to generic editor
    }

    navigation.openTab([...path, tileKey], nodeType as any);
  };

  const getTileStatus = (tileKey: string): ConfigTileStatus => {
    // For 'key' tile: only enabled if we have a ValueConfig with a key property
    if (tileKey === 'key') {
      if (isString) {
        // In string mode, there is no ValueConfig and no key property
        return { enabled: false, text: 'Not set' };
      } else if (isValueConfig) {
        // In ValueConfig mode, show the key property status
        const keyValue = valueConfig.key;
        return typeof keyValue === 'string' && keyValue
          ? { enabled: true, text: keyValue }
          : { enabled: false, text: 'Not set' };
      }
    }

    // For all other tiles, only show status if in ValueConfig mode
    if (!isValueConfig) {
      return { enabled: false, text: 'Not set' };
    }

    const configValue = valueConfig[tileKey];

    switch (tileKey) {
      case 'key':
        // Already handled above
        return { enabled: false, text: 'Not set' };

      case 'value':
        if (configValue !== undefined) {
          let displayText: string;
          if (typeof configValue === 'string') {
            displayText = configValue;
          } else if (typeof configValue === 'number') {
            displayText = String(configValue);
          } else if (typeof configValue === 'boolean') {
            displayText = String(configValue);
          } else if (configValue === null) {
            displayText = 'null';
          } else if (Array.isArray(configValue)) {
            displayText = `[${configValue.length} items]`;
          } else if (typeof configValue === 'object') {
            // Show only values, not keys
            const values = Object.values(
              configValue as Record<string, unknown>,
            );
            displayText = values
              .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
              .join(', ');
          } else {
            displayText = String(configValue);
          }
          // Truncate if too long
          const preview =
            displayText.length > 40
              ? displayText.substring(0, 40) + '...'
              : displayText;
          return { enabled: true, text: preview };
        }
        return { enabled: false, text: 'Not set' };

      case 'fn':
        if (typeof configValue === 'string' && configValue) {
          // Show preview of function (first 40 chars)
          const preview =
            configValue.length > 40
              ? configValue.substring(0, 40) + '...'
              : configValue;
          return { enabled: true, text: preview };
        }
        return { enabled: false, text: 'Not set' };

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
        if (Array.isArray(configValue) && configValue.length >= 1) {
          // Show the source array path
          const source = String(configValue[0] || 'nested');
          return { enabled: true, text: `Source: ${source}` };
        }
        return { enabled: false, text: 'Not set' };

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
        if (typeof configValue === 'string' && configValue) {
          // Show preview of validation function (first 40 chars)
          const preview =
            configValue.length > 40
              ? configValue.substring(0, 40) + '...'
              : configValue;
          return { enabled: true, text: preview };
        }
        return { enabled: false, text: 'Not set' };

      default:
        return { enabled: false, text: 'Not set' };
    }
  };

  // Input is ALWAYS enabled
  const inputPlaceholder = 'e.g., data.productId, user.email';

  const inputTitle = 'Enter a property path to extract data from the event';

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <PaneHeader
          title="Value Configuration"
          description="Configure how this value is resolved"
          onBack={navigation.goBack}
          canGoBack={navigation.canGoBack()}
        />

        {/* Quick Value Section */}
        <div className="elb-mapping-value-type-quick-section">
          <div className="elb-mapping-value-type-section-title">
            Dynamic Value
          </div>
          <MappingInput
            value={displayValue}
            onChange={handleStringChange}
            placeholder={inputPlaceholder}
            title={inputTitle}
          />
          <div className="elb-mapping-value-type-hint">
            {isString ? (
              <span>Property path to extract data from the event</span>
            ) : (
              <span className="is-info">
                Editing property path - synced with Key tile
              </span>
            )}
          </div>
        </div>

        {/* Advanced Configuration Section */}
        <div className="elb-mapping-value-type-advanced-section">
          <div className="elb-mapping-value-type-section-title">
            Advanced Configuration
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

import React from 'react';
import type { UseMappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';

export interface MappingRuleOverviewProps {
  path: string[];
  mappingState: UseMappingState;
  navigation: UseMappingNavigation;
  className?: string;
}

interface RuleTile {
  key: string;
  label: string;
  description: string;
}

const RULE_TILES: RuleTile[] = [
  { key: 'name', label: 'Name', description: 'Destination event name' },
  { key: 'data', label: 'Data', description: 'Map event data properties' },
  { key: 'batch', label: 'Batch', description: 'Send in batches' },
  { key: 'ignore', label: 'Ignore', description: 'Skip this event' },
  { key: 'consent', label: 'Consent', description: 'Required consent states' },
  { key: 'policy', label: 'Policy', description: 'Processing conditions' },
];

/**
 * Clean overview of rule configuration options
 * Shows grid of tiles - highlighted if value is set
 * Click tile to edit that specific property
 */
export function MappingRuleOverview({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingRuleOverviewProps) {
  const rule = mappingState.actions.getValue(path) as
    | Record<string, unknown>
    | undefined;

  const handleTileClick = (key: string) => {
    // For complex properties like data, show transformation tabs
    // For simple properties like name/batch/ignore, show simple editor
    const complexProperties = ['data', 'consent', 'policy'];

    if (complexProperties.includes(key)) {
      // Open with 'map' type to show transformation tabs
      navigation.openTab([...path, key], 'map');
    } else {
      // Simple value editor
      navigation.openTab([...path, key], 'valueConfig');
    }
  };

  const isSet = (key: string): boolean => {
    if (!rule) return false;
    const value = rule[key];
    return value !== undefined && value !== null;
  };

  return (
    <div className={`elb-mapping-rule-overview ${className}`}>
      <div className="elb-mapping-overview-grid">
        {RULE_TILES.map((tile) => (
          <button
            key={tile.key}
            className={`elb-mapping-overview-tile ${isSet(tile.key) ? 'is-set' : ''}`}
            onClick={() => handleTileClick(tile.key)}
            type="button"
          >
            <div className="elb-mapping-overview-tile-label">{tile.label}</div>
            <div className="elb-mapping-overview-tile-description">
              {tile.description}
            </div>
            {isSet(tile.key) && (
              <div className="elb-mapping-overview-tile-indicator">✓</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

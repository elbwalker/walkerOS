import React from 'react';
import type { UseMappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';
import { RuleTile, type RuleTileStatus } from '../atoms/rule-tile';

export interface MappingRuleOverviewProps {
  path: string[];
  mappingState: UseMappingState;
  navigation: UseMappingNavigation;
  className?: string;
}

interface RuleTileConfig {
  key: string;
  label: string;
  description: string;
  section: 'configuration' | 'options';
}

const RULE_TILES: RuleTileConfig[] = [
  {
    key: 'name',
    label: 'Name',
    description: 'Override the destination event name',
    section: 'configuration',
  },
  {
    key: 'data',
    label: 'Data',
    description: 'Transform event data properties',
    section: 'configuration',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Additional configuration options',
    section: 'configuration',
  },
  {
    key: 'batch',
    label: 'Batch',
    description: 'Send events in batches',
    section: 'options',
  },
  {
    key: 'ignore',
    label: 'Ignore',
    description: 'Skip this event',
    section: 'options',
  },
  {
    key: 'consent',
    label: 'Consent',
    description: 'Required consent states',
    section: 'options',
  },
  {
    key: 'policy',
    label: 'Policy',
    description: 'Processing conditions',
    section: 'options',
  },
];

/**
 * Compute status for each tile based on the rule value
 */
function getTileStatus(
  key: string,
  rule: Record<string, unknown> | undefined,
): RuleTileStatus {
  if (!rule) {
    return { enabled: false, text: 'Not set' };
  }

  const value = rule[key];

  switch (key) {
    case 'name':
      return value
        ? { enabled: true, text: String(value) }
        : { enabled: false, text: 'Not set' };

    case 'data': {
      if (!value) return { enabled: false, text: 'Not set' };
      const dataObj =
        typeof value === 'object' && value !== null && 'map' in value
          ? (value as { map: Record<string, unknown> }).map
          : (value as Record<string, unknown>);
      const count = Object.keys(dataObj || {}).length;
      return count > 0
        ? {
            enabled: true,
            text: `${count} ${count === 1 ? 'property' : 'properties'}`,
          }
        : { enabled: false, text: 'Not set' };
    }

    case 'settings': {
      if (!value) return { enabled: false, text: 'Not set' };
      const count = Object.keys(value as Record<string, unknown>).length;
      return count > 0
        ? {
            enabled: true,
            text: `${count} ${count === 1 ? 'option' : 'options'}`,
          }
        : { enabled: false, text: 'Not set' };
    }

    case 'batch':
      return value === true
        ? { enabled: true, text: 'Enabled' }
        : { enabled: false, text: 'Disabled' };

    case 'ignore':
      return value === true
        ? { enabled: true, text: 'Active' }
        : { enabled: false, text: 'Disabled' };

    case 'consent': {
      if (!value) return { enabled: false, text: 'Not set' };
      const count = Object.keys(value as Record<string, unknown>).length;
      return count > 0
        ? {
            enabled: true,
            text: `${count} ${count === 1 ? 'state' : 'states'}`,
          }
        : { enabled: false, text: 'Not set' };
    }

    case 'policy': {
      if (!value) return { enabled: false, text: 'Not set' };
      const count = Object.keys(value as Record<string, unknown>).length;
      return count > 0
        ? {
            enabled: true,
            text: `${count} ${count === 1 ? 'condition' : 'conditions'}`,
          }
        : { enabled: false, text: 'Not set' };
    }

    default:
      return { enabled: false, text: 'Not set' };
  }
}

/**
 * Rule overview with two sections:
 * 1. Rule Configuration - name, data, settings
 * 2. Processing Options - batch, ignore, consent, policy
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
    const complexProperties = ['data', 'consent', 'policy', 'settings'];

    if (complexProperties.includes(key)) {
      navigation.openTab([...path, key], 'map');
    } else {
      navigation.openTab([...path, key], 'valueConfig');
    }
  };

  const configurationTiles = RULE_TILES.filter(
    (tile) => tile.section === 'configuration',
  );
  const optionsTiles = RULE_TILES.filter((tile) => tile.section === 'options');

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        {/* Rule Configuration Section */}
        <div className="elb-mapping-rule-section">
          <div className="elb-mapping-rule-section-header">
            <div className="elb-mapping-rule-section-title">
              Rule Configuration
            </div>
            <div className="elb-mapping-rule-section-description">
              Configure how this event is transformed
            </div>
          </div>
          <div className="elb-mapping-rule-section-grid">
            {configurationTiles.map((tile) => (
              <RuleTile
                key={tile.key}
                label={tile.label}
                description={tile.description}
                status={getTileStatus(tile.key, rule)}
                onClick={() => handleTileClick(tile.key)}
              />
            ))}
          </div>
        </div>

        {/* Processing Options Section */}
        <div className="elb-mapping-rule-section">
          <div className="elb-mapping-rule-section-header">
            <div className="elb-mapping-rule-section-title">
              Processing Options
            </div>
            <div className="elb-mapping-rule-section-description">
              Control when and how this event is processed
            </div>
          </div>
          <div className="elb-mapping-rule-section-grid">
            {optionsTiles.map((tile) => (
              <RuleTile
                key={tile.key}
                label={tile.label}
                description={tile.description}
                status={getTileStatus(tile.key, rule)}
                onClick={() => handleTileClick(tile.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

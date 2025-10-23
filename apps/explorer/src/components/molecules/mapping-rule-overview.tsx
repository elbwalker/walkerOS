import React from 'react';
import type { UseMappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';
import { RuleTile, type RuleTileStatus } from '../atoms/config-tile';
import { PaneHeader } from '../atoms/pane-header';

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
    key: 'condition',
    label: 'Condition',
    description: 'When to apply this rule',
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
      return typeof value === 'number' && value > 0
        ? { enabled: true, text: `${value} ms` }
        : { enabled: false, text: 'Not set' };

    case 'ignore':
      return value === true
        ? { enabled: true, text: 'Active' }
        : { enabled: false, text: 'Disabled' };

    case 'condition':
      return typeof value === 'string' && value.trim()
        ? { enabled: true, text: 'Active' }
        : { enabled: false, text: 'Not set' };

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
    const complexProperties = ['data', 'settings'];

    if (key === 'name') {
      // Name is a simple string - use dedicated name pane
      navigation.openTab([...path, key], 'name');
    } else if (key === 'batch') {
      // Batch is a number - use dedicated batch pane
      navigation.openTab([...path, key], 'batch');
    } else if (key === 'ignore') {
      // Ignore is a boolean - use dedicated ignore pane
      navigation.openTab([...path, key], 'ignore');
    } else if (key === 'condition') {
      // Condition is a function - use dedicated condition pane
      navigation.openTab([...path, key], 'condition');
    } else if (key === 'consent') {
      // Consent is a map of state names - use dedicated consent pane
      navigation.openTab([...path, key], 'consent');
    } else if (key === 'policy') {
      // Policy is event-level policy rules - use policy overview pane
      navigation.openTab([...path, key], 'policy');
    } else if (complexProperties.includes(key)) {
      // Data and Settings are ValueType (string | ValueConfig)
      navigation.openTab([...path, key], 'valueType');
    } else {
      // Unknown properties - use value config
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
          <PaneHeader
            title="Rule Configuration"
            description="Configure how this event is transformed"
            onBack={navigation.goBack}
            canGoBack={navigation.canGoBack()}
          />
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
          <PaneHeader
            title="Processing Options"
            description="Control when and how this event is processed"
          />
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

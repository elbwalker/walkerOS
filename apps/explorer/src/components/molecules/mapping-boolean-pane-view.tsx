import React from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { Toggle } from '../atoms/toggle';

export interface MappingBooleanPaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

/**
 * Boolean Pane - Toggle switch for boolean settings
 *
 * Provides a simple on/off toggle for boolean fields in mapping configuration.
 * Uses animated toggle component for visual feedback.
 *
 * Used for settings like:
 * - enabled/disabled flags
 * - feature toggles
 * - binary configuration options
 *
 * @example
 * // Schema definition
 * enabled: { type: 'boolean', description: 'Enable tracking' }
 *
 * // Renders as toggle with label
 * <Toggle checked={true} onChange={...} label="Enabled" />
 */
export function MappingBooleanPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingBooleanPaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const booleanValue = typeof value === 'boolean' ? value : false;

  const handleChange = (newValue: boolean) => {
    mappingState.actions.setValue(path, newValue);
  };

  const fieldName = path[path.length - 1];
  const displayName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

  return (
    <BaseMappingPane
      title={`Boolean: ${displayName}`}
      description="Toggle to enable or disable"
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-pane-field">
        <div className="elb-mapping-boolean-toggle-wrapper">
          <Toggle
            checked={booleanValue}
            onChange={handleChange}
            label={booleanValue ? 'Enabled' : 'Disabled'}
          />
        </div>
        <div className="elb-mapping-pane-hint">
          {booleanValue
            ? 'This setting is currently enabled'
            : 'This setting is currently disabled'}
        </div>
      </div>
    </BaseMappingPane>
  );
}

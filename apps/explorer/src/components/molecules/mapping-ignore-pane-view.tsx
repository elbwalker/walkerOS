import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';

/**
 * Mapping Ignore Pane View
 *
 * Dedicated pane for the 'ignore' property - a boolean flag that determines
 * whether to skip processing this rule entirely.
 *
 * When set to true, the rule will be ignored by the collector.
 * When undefined/false, the rule processes normally.
 */
export interface MappingIgnorePaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

export function MappingIgnorePaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingIgnorePaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const isIgnored = value === true;

  const handleToggle = () => {
    if (isIgnored) {
      // Remove the ignore property
      mappingState.actions.deleteValue(path);
    } else {
      // Set ignore to true
      mappingState.actions.setValue(path, true);
    }
  };

  return (
    <BaseMappingPane
      title="Ignore Event"
      description="When enabled, events matching this mapping will be ignored and not processed by the destination."
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-ignore-pane">
        {/* Toggle Control */}
        <div className="elb-mapping-ignore-control">
          <label className="elb-mapping-ignore-label">
            <input
              type="checkbox"
              checked={isIgnored}
              onChange={handleToggle}
              className="elb-mapping-ignore-checkbox"
            />
            <span className="elb-mapping-ignore-label-text">Ignore events</span>
          </label>
        </div>

        {/* Status Indicator */}
        <div
          className={`elb-mapping-ignore-status ${isIgnored ? 'is-active' : ''}`}
        >
          <div className="elb-mapping-ignore-status-indicator" />
          <div className="elb-mapping-ignore-status-text">
            {isIgnored ? 'Events will be ignored' : 'Events will be processed'}
          </div>
        </div>
      </div>
    </BaseMappingPane>
  );
}

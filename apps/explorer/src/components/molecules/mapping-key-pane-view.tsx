import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingInput } from '../atoms/mapping-input';

/**
 * Key Pane View - Pure Presentation Component
 *
 * Edits the 'key' property - a string path that extracts data from the event.
 * This is used to reference properties like data.id, user.email, globals.currency.
 *
 * @example
 * <MappingKeyPaneView
 *   path={['page', 'view', 'data', 'map', 'currency', 'key']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 * />
 */
export interface MappingKeyPaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

export function MappingKeyPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingKeyPaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const keyValue = typeof value === 'string' ? value : '';

  const handleChange = (newValue: string) => {
    mappingState.actions.setValue(path, newValue);
  };

  return (
    <BaseMappingPane
      title="Property Path"
      description="Path to extract from event (e.g., data.id, user.email, globals.currency)"
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-pane-field">
        <MappingInput
          value={keyValue}
          onChange={handleChange}
          placeholder="data.property"
          autoFocus
        />
        <div className="elb-mapping-pane-hint">
          Common paths: data.*, globals.*, user.*, context.*
        </div>
      </div>
    </BaseMappingPane>
  );
}

import type { UseMappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';
import { PaneHeader } from '../atoms/pane-header';
import { MappingInput } from '../atoms/mapping-input';
import { MappingValueTypePaneView } from './mapping-value-type-pane-view';

export interface MappingLoopPaneViewProps {
  path: string[];
  mappingState: UseMappingState;
  navigation: UseMappingNavigation;
  className?: string;
}

/**
 * Loop Pane View - Array iteration with transformation
 *
 * Simple two-part interface:
 * 1. Input field for scope (array path to iterate over)
 * 2. Reused ValueTypePaneView for item mapping configuration
 *
 * Loop structure: [scope, itemMapping]
 * - scope: String path to array (e.g., 'nested') or 'this' for current value
 * - itemMapping: Value transformation applied to each array item
 *
 * @example
 * <MappingLoopPaneView
 *   path={['product', 'view', 'data', 'items', 'loop']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 * />
 */
export function MappingLoopPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingLoopPaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const loopArray = Array.isArray(value) && value.length === 2 ? value : null;

  const [scope, itemMapping] = loopArray || ['', undefined];

  const handleScopeChange = (newScope: string) => {
    // Only create loop array if scope has a value
    if (!newScope || newScope.trim() === '') {
      // If scope is empty, delete the loop entirely
      mappingState.actions.deleteValue(path);
      return;
    }

    // Update scope (first array element) while preserving item mapping
    mappingState.actions.setValue(path, [newScope, itemMapping]);
  };

  // If not initialized, show setup interface
  if (!loopArray) {
    return (
      <div className={`elb-mapping-pane ${className}`}>
        <div className="elb-mapping-pane-content">
          <PaneHeader
            title="Loop Array"
            description="Process arrays by applying transformation to each item"
          />

          {/* Scope Input */}
          <div className="elb-mapping-pane-field">
            <label className="elb-mapping-pane-label">
              Array Path <span className="elb-mapping-pane-required">*</span>
            </label>
            <MappingInput
              value={typeof scope === 'string' ? scope : ''}
              onChange={handleScopeChange}
              placeholder="nested"
              autoFocus
            />
            <div className="elb-mapping-pane-hint">
              Path to the array in the event (e.g., "nested", "data.items") or
              "this" for current value
            </div>
          </div>

          {/* Item Mapping - Reuse ValueTypePaneView */}
          <div className="elb-loop-item-mapping-section">
            <MappingValueTypePaneView
              path={[...path, '1']}
              mappingState={mappingState}
              navigation={navigation}
              className=""
            />
          </div>
        </div>
      </div>
    );
  }

  // Configured loop - show scope input + item mapping editor
  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <PaneHeader
          title="Loop Array"
          description="Process arrays by applying transformation to each item"
        />

        {/* Scope Input */}
        <div className="elb-mapping-pane-field">
          <label className="elb-mapping-pane-label">
            Array Path <span className="elb-mapping-pane-required">*</span>
          </label>
          <MappingInput
            value={typeof scope === 'string' ? scope : ''}
            onChange={handleScopeChange}
            placeholder="nested"
          />
          <div className="elb-mapping-pane-hint">
            Path to the array in the event (e.g., "nested", "data.items") or
            "this" for current value
          </div>
        </div>

        {/* Item Mapping - Reuse ValueTypePaneView */}
        <div className="elb-loop-item-mapping-section">
          <MappingValueTypePaneView
            path={[...path, '1']}
            mappingState={mappingState}
            navigation={navigation}
            className=""
          />
        </div>
      </div>
    </div>
  );
}

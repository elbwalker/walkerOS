import type { MappingState } from '../../hooks/useMappingState';
import { PaneHeader } from '../atoms/pane-header';
import { MappingInput } from '../atoms/mapping-input';

/**
 * Value Pane View - Pure Presentation Component
 *
 * Edits primitive values within a ValueConfig.
 * This is specifically for the 'value' property of a ValueConfig,
 * which holds primitives (string, number, boolean), NOT nested objects.
 *
 * Type: ValueConfig.value -> WalkerOS.PropertyType (string | number | boolean)
 *
 * @example
 * // Editing the 'value' property of a ValueConfig at path ['page', 'view', 'data', 'map', 'currency']
 * // Path would be: ['page', 'view', 'data', 'map', 'currency', 'value']
 * <MappingValuePaneView
 *   path={['page', 'view', 'data', 'map', 'currency', 'value']}
 *   mappingState={mappingState}
 * />
 */
export interface MappingValuePaneViewProps {
  path: string[];
  mappingState: MappingState;
  className?: string;
}

export function MappingValuePaneView({
  path,
  mappingState,
  className = '',
}: MappingValuePaneViewProps) {
  const value = mappingState.actions.getValue(path);

  // Convert current value to string for editing
  const stringValue =
    value === null ? 'null' : value === undefined ? '' : String(value);

  const handleChange = (newValue: string) => {
    // Try to infer the type from the input
    if (newValue === '') {
      // Empty string -> set as empty string (not undefined)
      mappingState.actions.setValue(path, '');
      return;
    }

    if (newValue === 'null') {
      mappingState.actions.setValue(path, null);
      return;
    }

    if (newValue === 'true') {
      mappingState.actions.setValue(path, true);
      return;
    }

    if (newValue === 'false') {
      mappingState.actions.setValue(path, false);
      return;
    }

    // Try parsing as number
    const asNumber = Number(newValue);
    if (!isNaN(asNumber) && newValue.trim() !== '') {
      mappingState.actions.setValue(path, asNumber);
      return;
    }

    // Default to string
    mappingState.actions.setValue(path, newValue);
  };

  // Determine the current type for hint display
  const currentType =
    value === null ? 'null' : value === undefined ? 'undefined' : typeof value;

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <PaneHeader
          title="Static Value"
          description="Fixed value that will be used (string, number, or boolean)"
        />

        <div className="elb-mapping-pane-field">
          <MappingInput
            value={stringValue}
            onChange={handleChange}
            placeholder="USD"
            autoFocus
          />
          <div className="elb-mapping-pane-hint">
            Current type: <strong>{currentType}</strong>
            <br />
            Use for constant values like currency codes, fixed IDs, etc.
            <br />
            Examples: "USD" (string), 123 (number), true (boolean), null
          </div>
        </div>
      </div>
    </div>
  );
}

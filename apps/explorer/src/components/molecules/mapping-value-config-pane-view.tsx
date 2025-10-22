import { MappingTypeSelector } from './mapping-type-selector';
import type { ValueConfigType } from '../atoms/mapping-type-button';
import type { MappingState } from '../../hooks/useMappingState';
import type { MappingNavigation } from '../../hooks/useMappingNavigation';
import { PaneHeader } from '../atoms/pane-header';
import { MappingInput } from '../atoms/mapping-input';

/**
 * ValueConfig Pane View - Pure Presentation Component
 *
 * Most complex pane - edits value transformations based on type:
 * - key: Extract value from event path (string)
 * - value: Static value (any type)
 * - map: Transform to object (opens MapPaneView)
 * - loop: Process array (opens LoopPaneView)
 * - function: Custom transformation (code editor)
 * - set: Array of static values
 *
 * Uses MappingTypeSelector to switch between types.
 *
 * @example
 * <MappingValueConfigPaneView
 *   path={['product', 'view', 'data']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 * />
 */
export interface MappingValueConfigPaneViewProps {
  path: string[];
  mappingState: MappingState;
  navigation: MappingNavigation;
  className?: string;
}

export function MappingValueConfigPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingValueConfigPaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const pathLabel = path[path.length - 1] || 'Value';

  // Determine current type
  const getCurrentType = (): ValueConfigType | null => {
    // Strings (including empty strings) are 'key' type
    if (typeof value === 'string') return 'key';
    // undefined or other primitives - return null so pathLabel can determine type
    if (value === undefined || typeof value !== 'object' || value === null)
      return null;
    // Check object properties
    if ('map' in value) return 'map';
    if ('loop' in value) return 'loop';
    if ('fn' in value) return 'function';
    if ('key' in value) return 'key';
    if ('value' in value) return 'value';
    if ('set' in value) return 'set';
    return null;
  };

  const currentType = getCurrentType();

  // Use pathLabel to determine type when value is undefined/null
  // This ensures correct editor when navigating to a specific property path
  const effectiveType = currentType || (pathLabel === 'key' ? 'key' : 'value');

  // Type change handler - converts value to new type
  const handleTypeChange = (newType: ValueConfigType) => {
    if (newType === currentType) return;

    switch (newType) {
      case 'key':
        mappingState.actions.setValue(path, 'data.property');
        break;
      case 'value':
        mappingState.actions.setValue(path, { value: '' });
        break;
      case 'map':
        mappingState.actions.setValue(path, { map: {} });
        break;
      case 'loop':
        mappingState.actions.setValue(path, { loop: ['nested', 'this'] });
        break;
      case 'function':
        mappingState.actions.setValue(path, { fn: '(event) => event.data' });
        break;
      case 'set':
        mappingState.actions.setValue(path, { set: [] });
        break;
    }
  };

  // Type-specific value handlers
  const handleKeyValueChange = (newValue: string) => {
    mappingState.actions.setValue(path, newValue);
  };

  const handleStaticValueChange = (newValue: string) => {
    // When the entire ValueConfig at 'path' is { value: X }, update it to { value: newValue }
    mappingState.actions.setValue(path, { value: newValue });
  };

  const handleFunctionChange = (newValue: string) => {
    mappingState.actions.setValue(path, { fn: newValue });
  };

  const handleOpenComplex = () => {
    const nodeType: 'map' | 'loop' | 'valueConfig' =
      currentType === 'map'
        ? 'map'
        : currentType === 'loop'
          ? 'loop'
          : 'valueConfig';
    navigation.openTab(path, nodeType);
  };

  // Render type-specific editor
  const renderEditor = () => {
    switch (effectiveType) {
      case 'key':
        const keyValue = typeof value === 'string' ? value : '';
        return (
          <>
            <PaneHeader
              title="Property Path"
              description="Path to extract from event (e.g., data.id, user.email, globals.currency)"
            />
            <div className="elb-mapping-pane-field">
              <MappingInput
                value={keyValue}
                onChange={handleKeyValueChange}
                placeholder="data.property"
                autoFocus
              />
              <div className="elb-mapping-pane-hint">
                Common paths: data.*, globals.*, user.*, context.*
              </div>
            </div>
          </>
        );

      case 'value':
        const staticValue =
          typeof value === 'object' && value !== null && 'value' in value
            ? ((value as Record<string, unknown>).value as string) || ''
            : '';
        return (
          <>
            <PaneHeader
              title="Static Value"
              description="Fixed value that will be used (string, number, or boolean)"
            />
            <div className="elb-mapping-pane-field">
              <MappingInput
                value={String(staticValue)}
                onChange={handleStaticValueChange}
                placeholder="USD"
              />
              <div className="elb-mapping-pane-hint">
                Use for constant values like currency codes, fixed IDs, etc.
              </div>
            </div>
          </>
        );

      case 'map':
        const mapObj =
          typeof value === 'object' && value !== null && 'map' in value
            ? ((value as Record<string, unknown>).map as Record<
                string,
                unknown
              >) || {}
            : {};
        const mapKeyCount = Object.keys(mapObj).length;
        return (
          <>
            <PaneHeader
              title="Map Object"
              description="Transform event data into an object with multiple keys"
            />
            <div className="elb-mapping-pane-field">
              <div className="elb-mapping-value-complex">
                <div className="elb-mapping-value-complex-info">
                  <span className="elb-mapping-pane-type-badge">map</span>
                  <span>
                    {mapKeyCount} {mapKeyCount === 1 ? 'key' : 'keys'} defined
                  </span>
                </div>
                <button
                  type="button"
                  className="elb-mapping-pane-button elb-mapping-pane-button--primary"
                  onClick={handleOpenComplex}
                >
                  Edit Map →
                </button>
              </div>
            </div>
          </>
        );

      case 'loop':
        const loopArr =
          typeof value === 'object' && value !== null && 'loop' in value
            ? ((value as Record<string, unknown>).loop as unknown[]) || []
            : [];
        const loopSource = (
          Array.isArray(loopArr) && loopArr.length > 0 ? loopArr[0] : 'nested'
        ) as string;
        return (
          <>
            <PaneHeader
              title="Loop Array"
              description="Process an array of items from the event"
            />
            <div className="elb-mapping-pane-field">
              <div className="elb-mapping-value-complex">
                <div className="elb-mapping-value-complex-info">
                  <span className="elb-mapping-pane-type-badge">loop</span>
                  <span>Source: {loopSource}</span>
                </div>
                <button
                  type="button"
                  className="elb-mapping-pane-button elb-mapping-pane-button--primary"
                  onClick={handleOpenComplex}
                >
                  Edit Loop →
                </button>
              </div>
            </div>
          </>
        );

      case 'function':
        const fnValue =
          typeof value === 'object' && value !== null && 'fn' in value
            ? ((value as Record<string, unknown>).fn as string) ||
              '(event) => event.data'
            : '(event) => event.data';
        return (
          <>
            <PaneHeader
              title="Custom Function"
              description="JavaScript function that receives the event and returns transformed value"
            />
            <div className="elb-mapping-pane-field">
              <textarea
                id="value-function"
                className="elb-mapping-pane-textarea"
                value={String(fnValue)}
                onChange={(e) => handleFunctionChange(e.target.value)}
                placeholder="(event) => event.data.id"
                rows={6}
              />
              <div className="elb-mapping-pane-hint">
                Function signature: (event: WalkerOS.Event) =&gt; any
              </div>
            </div>
          </>
        );

      case 'set':
        const setArr =
          typeof value === 'object' && value !== null && 'set' in value
            ? ((value as Record<string, unknown>).set as unknown[]) || []
            : [];
        const setCount = Array.isArray(setArr) ? setArr.length : 0;
        return (
          <>
            <PaneHeader
              title="Static Array"
              description="Array of static values"
            />
            <div className="elb-mapping-pane-field">
              <div className="elb-mapping-value-complex">
                <div className="elb-mapping-value-complex-info">
                  <span className="elb-mapping-pane-type-badge">set</span>
                  <span>
                    {setCount} {setCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <button
                  type="button"
                  className="elb-mapping-pane-button elb-mapping-pane-button--primary"
                  onClick={handleOpenComplex}
                  disabled
                  title="Coming soon"
                >
                  Edit Set →
                </button>
              </div>
            </div>
          </>
        );

      default:
        return (
          <div className="elb-mapping-pane-error">
            Unknown value type. Please select a transformation type above.
          </div>
        );
    }
  };

  return (
    <div className={`elb-mapping-value-pane ${className}`}>
      {/* No type selector - just the clean editor */}
      <div className="elb-mapping-pane-content">{renderEditor()}</div>
    </div>
  );
}

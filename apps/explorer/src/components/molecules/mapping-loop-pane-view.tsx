import type { MappingState } from '../../hooks/useMappingState';
import type { MappingNavigation } from '../../hooks/useMappingNavigation';

/**
 * Loop Pane View - Pure Presentation Component
 *
 * Edits loop array transformations:
 * {
 *   loop: [
 *     'nested',           // Source array path
 *     { map: {...} }      // Item transformation
 *   ]
 * }
 *
 * Provides:
 * - Input for source array path
 * - Display of current transformation type
 * - Button to open transformation in new tab
 *
 * @example
 * <MappingLoopPaneView
 *   path={['product', 'view', 'data', 'items']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 * />
 */
export interface MappingLoopPaneViewProps {
  path: string[];
  mappingState: MappingState;
  navigation: MappingNavigation;
  className?: string;
}

export function MappingLoopPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingLoopPaneViewProps) {
  // Get current loop value
  const loopValue = mappingState.actions.getValue(path) as
    | unknown[]
    | undefined;

  if (!Array.isArray(loopValue) || loopValue.length !== 2) {
    return (
      <div className={`elb-mapping-pane elb-mapping-loop-pane ${className}`}>
        <div className="elb-mapping-pane-error">
          Invalid loop configuration at path: {path.join(' > ')}
          <div className="elb-mapping-pane-hint">
            Loop must be an array with exactly 2 elements: [sourcePath,
            transformation]
          </div>
        </div>
      </div>
    );
  }

  const [sourcePath, transformation] = loopValue;
  const pathLabel = path[path.length - 1] || 'Loop';

  // Get transformation type
  const getTransformationType = (value: unknown): string => {
    if (typeof value === 'string') return 'key';
    if (typeof value !== 'object' || value === null) return 'value';
    if ('map' in value) return 'map';
    if ('loop' in value) return 'loop';
    if ('fn' in value) return 'function';
    if ('key' in value) return 'key';
    if ('value' in value) return 'value';
    if ('set' in value) return 'set';
    return 'object';
  };

  const transformationType = getTransformationType(transformation);

  // Handlers
  const handleSourcePathChange = (value: string) => {
    mappingState.actions.setValue(path, [value, transformation]);
  };

  const handleOpenTransformation = () => {
    // Create a temporary path for the transformation
    // We'll open it in a tab so user can edit it
    const nodeType: 'map' | 'loop' | 'valueConfig' =
      transformationType === 'map'
        ? 'map'
        : transformationType === 'loop'
          ? 'loop'
          : 'valueConfig';

    // Open with a special path indicating it's a loop transformation
    navigation.openTab([...path, 'transform'], nodeType);
  };

  const handleResetTransformation = () => {
    // Reset to simple key extraction
    mappingState.actions.setValue(path, [sourcePath, 'this']);
  };

  return (
    <div className={`elb-mapping-pane elb-mapping-loop-pane ${className}`}>
      {/* Pane Header */}
      <div className="elb-mapping-pane-header">
        <h3 className="elb-mapping-pane-title">{pathLabel}</h3>
        <span className="elb-mapping-pane-type">Loop Transformation</span>
      </div>

      {/* Pane Content */}
      <div className="elb-mapping-pane-content">
        {/* Source Array Path */}
        <div className="elb-mapping-pane-field">
          <label htmlFor="loop-source" className="elb-mapping-pane-label">
            Source Array Path{' '}
            <span className="elb-mapping-pane-required">*</span>
          </label>
          <div className="elb-mapping-pane-description">
            Path to the array in the event to loop over (e.g., "nested" or
            "data.items")
          </div>
          <input
            id="loop-source"
            type="text"
            className="elb-mapping-pane-input"
            value={typeof sourcePath === 'string' ? sourcePath : ''}
            onChange={(e) => handleSourcePathChange(e.target.value)}
            placeholder="nested"
          />
          {sourcePath === 'this' && (
            <div className="elb-mapping-pane-hint">
              Using "this" means the current value is already an array
            </div>
          )}
        </div>

        {/* Item Transformation */}
        <div className="elb-mapping-pane-field">
          <div className="elb-mapping-pane-label">Item Transformation</div>
          <div className="elb-mapping-pane-description">
            How to transform each item in the array
          </div>

          <div className="elb-mapping-loop-transform">
            <div className="elb-mapping-loop-transform-info">
              <span className="elb-mapping-pane-type-badge">
                {transformationType}
              </span>
              <span className="elb-mapping-loop-transform-summary">
                {transformationType === 'key' &&
                  'Extract property from each item'}
                {transformationType === 'value' &&
                  'Replace each item with static value'}
                {transformationType === 'map' &&
                  'Transform each item with map object'}
                {transformationType === 'loop' && 'Nested loop transformation'}
                {transformationType === 'function' &&
                  'Custom function per item'}
                {transformationType === 'set' &&
                  'Array of static values per item'}
              </span>
            </div>

            <div className="elb-mapping-loop-transform-actions">
              <button
                type="button"
                className="elb-mapping-pane-button elb-mapping-pane-button--primary"
                onClick={handleOpenTransformation}
              >
                Edit Transformation →
              </button>
              <button
                type="button"
                className="elb-mapping-pane-button"
                onClick={handleResetTransformation}
                title="Reset to simple property extraction"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Example Output */}
        <div className="elb-mapping-pane-field">
          <div className="elb-mapping-pane-label">How it Works</div>
          <div className="elb-mapping-pane-info-box">
            <strong>Example:</strong>
            <pre className="elb-mapping-pane-code">
              {`// Input event
{
  ${sourcePath}: [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" }
  ]
}

// Output: Array of transformed items
// Each item processed by the ${transformationType} transformation`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { UseMappingStateReturn } from '../../hooks/useMappingState';

/**
 * Rule Pane View - Pure Presentation Component
 *
 * Edits top-level rule configuration properties:
 * - name: Transformed event name
 * - batch: Batch timeout in milliseconds (optional)
 * - ignore: Skip processing flag (optional)
 *
 * Advanced properties (consent, condition, validate) are handled
 * by separate collapsible sections.
 *
 * @example
 * <MappingRulePaneView
 *   path={['product', 'view']}
 *   mappingState={mappingState}
 * />
 */
export interface MappingRulePaneViewProps {
  path: string[]; // Must be exactly 2 elements: [entity, action]
  mappingState: UseMappingStateReturn;
  className?: string;
}

export function MappingRulePaneView({
  path,
  mappingState,
  className = '',
}: MappingRulePaneViewProps) {
  // Get current rule config
  const rule = mappingState.actions.getValue(path) as
    | Record<string, unknown>
    | undefined;

  if (!rule || typeof rule !== 'object') {
    return (
      <div className={`elb-mapping-pane elb-mapping-rule-pane ${className}`}>
        <div className="elb-mapping-pane-error">
          Invalid rule configuration at path: {path.join(' > ')}
        </div>
      </div>
    );
  }

  const [entity, action] = path;
  const ruleName = rule.name as string | undefined;
  const batch = rule.batch as number | undefined;
  const ignore = rule.ignore as boolean | undefined;

  // Update handlers
  const handleNameChange = (value: string) => {
    mappingState.actions.setValue([...path, 'name'], value);
  };

  const handleBatchChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue <= 0) {
      mappingState.actions.deleteValue([...path, 'batch']);
    } else {
      mappingState.actions.setValue([...path, 'batch'], numValue);
    }
  };

  const handleIgnoreChange = (checked: boolean) => {
    if (checked) {
      mappingState.actions.setValue([...path, 'ignore'], true);
    } else {
      mappingState.actions.deleteValue([...path, 'ignore']);
    }
  };

  return (
    <div className={`elb-mapping-pane elb-mapping-rule-pane ${className}`}>
      {/* Pane Header */}
      <div className="elb-mapping-pane-header">
        <h3 className="elb-mapping-pane-title">
          Rule: {entity} {action}
        </h3>
        <span className="elb-mapping-pane-type">Rule Configuration</span>
      </div>

      {/* Pane Content */}
      <div className="elb-mapping-pane-content">
        {/* Name Field (Required) */}
        <div className="elb-mapping-pane-field">
          <label htmlFor="rule-name" className="elb-mapping-pane-label">
            Event Name <span className="elb-mapping-pane-required">*</span>
          </label>
          <div className="elb-mapping-pane-description">
            The transformed event name sent to destinations
          </div>
          <input
            id="rule-name"
            type="text"
            className="elb-mapping-pane-input"
            value={ruleName || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={`${entity}_${action}`}
          />
        </div>

        {/* Batch Field (Optional) */}
        <div className="elb-mapping-pane-field">
          <label htmlFor="rule-batch" className="elb-mapping-pane-label">
            Batch Timeout (ms)
          </label>
          <div className="elb-mapping-pane-description">
            Wait time before sending event (for batching multiple events)
          </div>
          <input
            id="rule-batch"
            type="number"
            className="elb-mapping-pane-input"
            value={batch || ''}
            onChange={(e) => handleBatchChange(e.target.value)}
            placeholder="e.g., 1000"
            min="0"
            step="100"
          />
          {batch && (
            <div className="elb-mapping-pane-hint">
              Events will batch for {batch}ms before sending
            </div>
          )}
        </div>

        {/* Ignore Field (Optional) */}
        <div className="elb-mapping-pane-field">
          <label className="elb-mapping-pane-checkbox-label">
            <input
              type="checkbox"
              className="elb-mapping-pane-checkbox"
              checked={ignore || false}
              onChange={(e) => handleIgnoreChange(e.target.checked)}
            />
            <span>Ignore this rule (skip processing)</span>
          </label>
          {ignore && (
            <div className="elb-mapping-pane-hint elb-mapping-pane-hint--warning">
              This rule will not be processed
            </div>
          )}
        </div>
      </div>

      {/* Advanced Section Placeholders */}
      <div className="elb-mapping-pane-advanced">
        <div className="elb-mapping-pane-section-title">Advanced Options</div>
        <div className="elb-mapping-pane-advanced-buttons">
          <button
            type="button"
            className="elb-mapping-pane-advanced-button"
            disabled
            title="Coming in next phase"
          >
            + Add Data Transformation
          </button>
          <button
            type="button"
            className="elb-mapping-pane-advanced-button"
            disabled
            title="Coming in next phase"
          >
            + Add Consent Requirements
          </button>
          <button
            type="button"
            className="elb-mapping-pane-advanced-button"
            disabled
            title="Coming in next phase"
          >
            + Add Condition
          </button>
        </div>
      </div>
    </div>
  );
}

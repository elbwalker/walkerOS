import React from 'react';
import type { UseMappingState } from '../../hooks/useMappingState';

export interface MappingBatchPaneViewProps {
  path: string[];
  mappingState: UseMappingState;
  className?: string;
}

/**
 * Batch Pane - Number input for batch size configuration
 *
 * The batch property is a number that specifies how many events to batch together.
 * From packages/core/src/types/mapping.ts:
 *   batch?: number;  // Batch size in milliseconds or event count
 */
export function MappingBatchPaneView({
  path,
  mappingState,
  className = '',
}: MappingBatchPaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const batchValue = typeof value === 'number' ? value : '';

  const handleChange = (newValue: string) => {
    if (newValue.trim() === '') {
      // Delete if empty
      mappingState.actions.deleteValue(path);
    } else {
      const numValue = parseInt(newValue, 10);
      if (!isNaN(numValue) && numValue > 0) {
        mappingState.actions.setValue(path, numValue);
      }
    }
  };

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <div className="elb-mapping-pane-field">
          <label htmlFor="batch-input" className="elb-mapping-pane-label">
            Batch Size
          </label>
          <div className="elb-mapping-pane-description">
            Specify the batch size in milliseconds (time-based) or event count.
          </div>
          <input
            id="batch-input"
            type="number"
            min="1"
            step="1"
            className="elb-mapping-batch-input"
            value={batchValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="e.g., 200, 1000, 5000"
          />
          <div className="elb-mapping-pane-hint">
            Events will be collected and sent in batches. Use time (ms) for
            timed batches or count for event-based batches. Leave empty to
            disable batching.
          </div>
        </div>

        <div className="elb-mapping-batch-examples">
          <div className="elb-mapping-batch-examples-title">
            Common Use Cases:
          </div>
          <ul className="elb-mapping-batch-examples-list">
            <li>
              <code>200</code> - Send every 200ms (frequent updates)
            </li>
            <li>
              <code>1000</code> - Send every second (balanced)
            </li>
            <li>
              <code>5000</code> - Send every 5 seconds (reduced requests)
            </li>
            <li>
              <code>10</code> - Send every 10 events (event-based batching)
            </li>
          </ul>
          <div className="elb-mapping-batch-note">
            <strong>Note:</strong> Batching reduces network requests by grouping
            multiple events together. Lower values = more frequent sends, higher
            values = fewer requests but longer delays.
          </div>
        </div>
      </div>
    </div>
  );
}

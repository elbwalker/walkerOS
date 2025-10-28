import React from 'react';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingInput } from '../atoms/mapping-input';
import { validateValue } from '../../utils/schema-validation';

export interface MappingBatchPaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  schema?: RJSFSchema;
  uiSchema?: UiSchema;
  className?: string;
}

/**
 * Batch Pane - Number input with text-based validation
 *
 * The batch property is a number that specifies how many events to batch together.
 * From packages/core/src/types/mapping.ts:
 *   batch?: number;  // Batch size in milliseconds or event count
 *
 * Uses type="text" to allow typing ANY value (including letters) for validation feedback
 */
export function MappingBatchPaneView({
  path,
  mappingState,
  navigation,
  schema,
  uiSchema,
  className = '',
}: MappingBatchPaneViewProps) {
  const value = mappingState.actions.getValue(path);

  // Convert to string for editing
  const stringValue =
    value === null ? 'null' : value === undefined ? '' : String(value);

  const handleChange = (newValue: string) => {
    // Empty string handling - delete the value
    if (newValue === '') {
      mappingState.actions.deleteValue(path);
      return;
    }

    // Try to coerce to number
    const asNumber = Number(newValue);
    if (!isNaN(asNumber)) {
      mappingState.actions.setValue(path, asNumber);
    } else {
      // Store as string - validation will show error
      mappingState.actions.setValue(path, newValue);
    }
  };

  // Validate current value
  const validationResult = validateValue(value, schema);
  const hasError = !validationResult.valid;

  // Get title and description from schema or use defaults
  const title = schema?.title || 'Batch Size';
  const description =
    schema?.description ||
    'Specify the batch size in milliseconds (time-based) or event count.';
  const placeholder = uiSchema?.['ui:placeholder'] || 'e.g., 200, 1000, 5000';

  return (
    <BaseMappingPane
      title={title}
      description={description}
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-pane-field">
        <MappingInput
          type="text"
          value={stringValue}
          onChange={handleChange}
          placeholder={placeholder}
          error={hasError}
        />
        <div className="elb-mapping-pane-hint">
          {uiSchema?.['ui:help'] ||
            'Events will be collected and sent in batches. Use time (ms) for timed batches or count for event-based batches. Leave empty to disable batching.'}
          {hasError && validationResult.error && (
            <>
              <br />
              <span style={{ color: 'var(--color-button-danger)' }}>
                ⚠ {validationResult.error}
              </span>
            </>
          )}
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
    </BaseMappingPane>
  );
}

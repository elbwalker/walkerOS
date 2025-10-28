import React from 'react';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingInput } from '../atoms/mapping-input';
import { validateValue } from '../../utils/schema-validation';

export interface MappingNamePaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  schema?: RJSFSchema;
  uiSchema?: UiSchema;
  className?: string;
}

/**
 * Name Pane - Text input with schema validation for rule name override
 *
 * The name property is a simple string that overrides the destination event name.
 * From packages/core/src/types/mapping.ts:
 *   name?: string;  // Use a custom event name
 *
 * Uses type="text" with schema validation (minLength, maxLength, pattern)
 */
export function MappingNamePaneView({
  path,
  mappingState,
  navigation,
  schema,
  uiSchema,
  className = '',
}: MappingNamePaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const nameValue = typeof value === 'string' ? value : '';

  const handleChange = (newValue: string) => {
    if (newValue.trim() === '') {
      // Delete if empty
      mappingState.actions.deleteValue(path);
    } else {
      mappingState.actions.setValue(path, newValue);
    }
  };

  // Validate current value
  const validationResult = validateValue(value, schema);
  const hasError = !validationResult.valid;

  // Get title and description from schema or use defaults
  const title = schema?.title || 'Event Name Override';
  const description =
    schema?.description ||
    'Override the destination event name with a custom string';
  const placeholder =
    uiSchema?.['ui:placeholder'] ||
    'e.g., page_view, product_click, order_complete';

  return (
    <BaseMappingPane
      title={title}
      description={description}
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-pane-field">
        <MappingInput
          value={nameValue}
          onChange={handleChange}
          placeholder={placeholder}
          type="text"
          error={hasError}
        />
        <div className="elb-mapping-pane-hint">
          {uiSchema?.['ui:help'] ||
            'This string will be sent to the destination instead of the default entity-action name. Leave empty to use default.'}
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

      <div className="elb-mapping-name-examples">
        <div className="elb-mapping-name-examples-title">Common Examples:</div>
        <ul className="elb-mapping-name-examples-list">
          <li>
            <code>page_view</code> - Google Analytics style
          </li>
          <li>
            <code>PageView</code> - Pascal case for tracking systems
          </li>
          <li>
            <code>view_item</code> - GA4 recommended event names
          </li>
          <li>
            <code>product.viewed</code> - Segment style with dots
          </li>
        </ul>
      </div>
    </BaseMappingPane>
  );
}

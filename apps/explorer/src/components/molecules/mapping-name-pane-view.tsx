import React from 'react';
import type { UseMappingState } from '../../hooks/useMappingState';

export interface MappingNamePaneViewProps {
  path: string[];
  mappingState: UseMappingState;
  className?: string;
}

/**
 * Name Pane - Simple string input for rule name override
 *
 * The name property is a simple string that overrides the destination event name.
 * From packages/core/src/types/mapping.ts:
 *   name?: string;  // Use a custom event name
 */
export function MappingNamePaneView({
  path,
  mappingState,
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

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <div className="elb-mapping-pane-field">
          <label htmlFor="name-input" className="elb-mapping-pane-label">
            Event Name Override
          </label>
          <div className="elb-mapping-pane-description">
            Override the destination event name with a custom string.
          </div>
          <input
            id="name-input"
            type="text"
            className="elb-mapping-name-input"
            value={nameValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="e.g., page_view, product_click, order_complete"
          />
          <div className="elb-mapping-pane-hint">
            This string will be sent to the destination instead of the default
            entity-action name. Leave empty to use default.
          </div>
        </div>

        <div className="elb-mapping-name-examples">
          <div className="elb-mapping-name-examples-title">
            Common Examples:
          </div>
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
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { MappingCollapsible } from './mapping-collapsible';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import {
  valueConfigSchema,
  valueConfigUiSchema,
} from '../../schemas/value-config-schema';
import { IconButton } from './icon-button';
import { cleanFormData } from '../../utils/clean-form-data';

/**
 * MappingDataWidget - RJSF widget for data transformation
 *
 * Manages ValueConfig as an object for data transformation.
 * Contains a nested RJSF form for ValueConfig properties.
 *
 * States:
 * - Default (no data): Shows collapsed toggle with "Add data transformation" button
 * - With data: Shows toggle collapsible section with ValueConfig form
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     data: {
 *       type: 'object',
 *       title: 'Data',
 *       description: 'Transform event data'
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   data: {
 *     'ui:field': 'mappingData'
 *   }
 * }
 */
export function MappingDataWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    rawErrors = [],
    schema,
  } = props;

  const dataConfig = (value as Record<string, unknown> | undefined) || {};
  const hasData = Object.keys(dataConfig).length > 0;

  // Extract title and description from schema
  const title = schema?.title || 'Data';
  const description = schema?.description;

  // Track if user wants to show the form (either has data or clicked add button)
  const [showForm, setShowForm] = useState(hasData);

  // Start expanded if we have existing data or form is shown
  const [isExpanded, setIsExpanded] = useState(hasData);

  // Track previous value to avoid redundant updates
  const prevValueRef = useRef<unknown>(value);

  // Update state when value changes externally (e.g., switching between mapping rules)
  useEffect(() => {
    const newHasData =
      value && typeof value === 'object' && Object.keys(value).length > 0;
    setShowForm(!!newHasData);
    setIsExpanded(!!newHasData);
  }, [value]);

  const handleAddData = () => {
    // Show the form without initializing data
    setShowForm(true);
    setIsExpanded(true);
  };

  const handleFormChange = useCallback(
    (formData: unknown) => {
      const newData = cleanFormData(formData as Record<string, unknown>);

      // If all fields are empty, set to undefined
      const finalData = Object.keys(newData).length > 0 ? newData : undefined;

      // Only call onChange if data actually changed
      if (prevValueRef.current !== finalData) {
        prevValueRef.current = finalData;
        onChange(finalData);
      }
    },
    [onChange],
  );

  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <div className="elb-rjsf-widget">
      <div className="elb-data-widget-wrapper">
        <MappingCollapsible
          mode="toggle"
          title={title}
          description={description}
          isExpanded={isExpanded}
          onToggle={setIsExpanded}
        >
          {showForm ? (
            <div className="elb-data-widget-form">
              <MappingFormWrapper
                schema={valueConfigSchema}
                uiSchema={valueConfigUiSchema}
                formData={hasData ? dataConfig : undefined}
                onChange={handleFormChange}
                nested={true}
              />
            </div>
          ) : (
            <IconButton
              icon="add"
              variant="default"
              onClick={handleAddData}
              disabled={disabled || readonly}
              className="elb-data-add-button"
            >
              Add data transformation
            </IconButton>
          )}
        </MappingCollapsible>
      </div>
      {hasError && (
        <div className="elb-rjsf-error">
          {rawErrors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}

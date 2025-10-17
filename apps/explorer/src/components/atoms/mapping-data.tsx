import React, { useState, useEffect } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { MappingCollapsible } from './mapping-collapsible';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import {
  valueConfigSchema,
  valueConfigUiSchema,
} from '../../schemas/value-config-schema';
import { IconButton } from './icon-button';

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

  // Start expanded if we have existing data
  const [isExpanded, setIsExpanded] = useState(hasData);

  // Update expanded state when data changes (e.g., switching between mapping rules)
  useEffect(() => {
    setIsExpanded(hasData);
  }, [hasData]);

  const handleAddData = () => {
    // Add initial data configuration with empty key
    const newData = { key: '' };
    onChange(newData);
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleFormChange = (formData: unknown) => {
    const newData = cleanFormData(formData as Record<string, unknown>);

    // If all fields are empty, set to undefined
    const finalData = Object.keys(newData).length > 0 ? newData : undefined;
    onChange(finalData);
  };

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
          {hasData ? (
            <div className="elb-data-widget-form">
              <MappingFormWrapper
                schema={valueConfigSchema}
                uiSchema={valueConfigUiSchema}
                formData={dataConfig}
                onChange={handleFormChange}
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

/**
 * Clean form data by removing undefined and empty values
 */
function cleanFormData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Skip empty strings
    if (value === '') continue;

    // Skip empty objects
    if (
      typeof value === 'object' &&
      value !== null &&
      Object.keys(value).length === 0
    )
      continue;

    // Keep all other values
    cleaned[key] = value;
  }

  return cleaned;
}

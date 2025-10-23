import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { MappingCollapsible } from './mapping-collapsible';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import { IconButton } from './icon-button';
import { cleanFormData } from '../../utils/clean-form-data';

/**
 * MappingSettingsWidget - RJSF widget for destination-specific settings
 *
 * Manages settings as an object for destination-specific configuration.
 * Contains a nested RJSF form for settings properties when schema is provided.
 *
 * States:
 * - Default (no settings): Shows collapsed toggle with "Add settings" button
 * - With schema: Shows toggle collapsible section with schema-based form
 * - Without schema: Shows toggle collapsible section with JSON editor fallback
 *
 * The widget receives destination schemas via uiSchema['ui:options']:
 * - schema: RJSF schema for the settings object
 * - uiSchema: UI customization for settings fields
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     settings: {
 *       type: 'object',
 *       title: 'Settings',
 *       description: 'Destination-specific configuration'
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema (with destination schema):
 * const uiSchema = {
 *   settings: {
 *     'ui:field': 'mappingSettings',
 *     'ui:options': {
 *       schema: metaSchema.mappingSchema,
 *       uiSchema: metaSchema.mappingUiSchema
 *     }
 *   }
 * }
 */
export function MappingSettingsWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    rawErrors = [],
    schema,
    uiSchema,
  } = props;

  const settingsConfig = (value as Record<string, unknown> | undefined) || {};
  const hasSettings = Object.keys(settingsConfig).length > 0;

  // Extract title and description from schema
  const title = schema?.title || 'Settings';
  const description =
    schema?.description || 'Destination-specific configuration overrides';

  // Extract destination schemas from uiSchema options
  const destinationSchema = uiSchema?.['ui:options']?.schema as
    | RJSFSchema
    | undefined;
  const destinationUiSchema = uiSchema?.['ui:options']?.uiSchema as
    | UiSchema
    | undefined;

  // Determine if we have a schema to work with
  const hasSchema =
    destinationSchema &&
    destinationSchema.properties &&
    Object.keys(destinationSchema.properties).length > 0;

  // Track if user wants to show the form (either has settings or clicked add button)
  const [showForm, setShowForm] = useState(hasSettings);

  // Start expanded if we have existing settings or form is shown
  const [isExpanded, setIsExpanded] = useState(hasSettings);

  // Track previous value to avoid redundant updates
  const prevValueRef = useRef<unknown>(value);

  // Update state when value changes externally (e.g., switching between mapping rules)
  useEffect(() => {
    const newHasSettings =
      value && typeof value === 'object' && Object.keys(value).length > 0;
    setShowForm(!!newHasSettings);
    setIsExpanded(!!newHasSettings);
  }, [value]);

  const handleAddSettings = () => {
    // Show the form without initializing settings
    setShowForm(true);
    setIsExpanded(true);
  };

  const handleFormChange = useCallback(
    (formData: unknown) => {
      const newSettings = cleanFormData(formData as Record<string, unknown>);

      // If all fields are empty, set to undefined
      const finalSettings =
        Object.keys(newSettings).length > 0 ? newSettings : undefined;

      // Only call onChange if settings actually changed
      if (prevValueRef.current !== finalSettings) {
        prevValueRef.current = finalSettings;
        onChange(finalSettings);
      }
    },
    [onChange],
  );

  const handleClear = () => {
    onChange(undefined);
    setShowForm(false);
    setIsExpanded(false);
  };

  const hasError = rawErrors && rawErrors.length > 0;

  // Mode 1: No settings yet - show add button
  if (!showForm) {
    return (
      <div className="elb-rjsf-widget">
        <div className="elb-settings-widget-wrapper">
          <MappingCollapsible
            mode="toggle"
            title={title}
            description={description}
            isExpanded={isExpanded}
            onToggle={setIsExpanded}
            className={hasError ? 'elb-field-error' : ''}
          >
            <div className="elb-settings-widget-add">
              <p className="elb-settings-widget-hint">
                {hasSchema
                  ? 'Configure destination-specific options for this event'
                  : 'Add settings object (schema not available)'}
              </p>
              <IconButton
                icon="add"
                variant="secondary"
                size="small"
                onClick={handleAddSettings}
                disabled={disabled || readonly}
              >
                Add Settings
              </IconButton>
            </div>
          </MappingCollapsible>
          {hasError && (
            <div className="elb-rjsf-error">
              {rawErrors.map((error, i) => (
                <span key={i}>{error}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mode 2: Has settings - show form with schema or fallback
  return (
    <div className="elb-rjsf-widget">
      <div className="elb-settings-widget-wrapper">
        <MappingCollapsible
          mode="toggle"
          title={title}
          description={description}
          isExpanded={isExpanded}
          onToggle={setIsExpanded}
          className={hasError ? 'elb-field-error' : ''}
        >
          <div className="elb-settings-widget-content">
            {hasSchema ? (
              // Schema-aware mode: Use destination schema
              <div className="elb-settings-widget-form">
                <MappingFormWrapper
                  schema={destinationSchema}
                  uiSchema={destinationUiSchema}
                  formData={value || {}}
                  onChange={handleFormChange}
                />
              </div>
            ) : (
              // Fallback mode: Show message + JSON representation
              <div className="elb-settings-widget-fallback">
                <p className="elb-settings-widget-hint">
                  This destination doesn't provide a visual settings editor.
                  Settings are stored as a JSON object.
                </p>
                <pre className="elb-settings-widget-json">
                  {JSON.stringify(value, null, 2)}
                </pre>
                <p className="elb-settings-widget-hint text-muted">
                  Edit via Code view or update the mapping configuration
                  directly.
                </p>
              </div>
            )}

            <div className="elb-settings-widget-actions">
              <IconButton
                icon="delete"
                variant="danger"
                size="small"
                onClick={handleClear}
                disabled={disabled || readonly}
              >
                Clear Settings
              </IconButton>
            </div>
          </div>
        </MappingCollapsible>
        {hasError && (
          <div className="elb-rjsf-error">
            {rawErrors.map((error, i) => (
              <span key={i}>{error}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MappingSettingsWidget;

import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingInput } from '../atoms/mapping-input';
import { validateValue } from '../../utils/schema-validation';

/**
 * Primitive Pane View - Schema-validated text input for primitive values
 *
 * Uses type="text" with schema validation to allow typing ANY value:
 * - String fields (with pattern, minLength, maxLength validation)
 * - Number fields (with min, max validation)
 * - Schema-based hints and placeholders
 * - Real-time validation with error highlighting
 * - Allows typing invalid values to show validation errors
 *
 * Examples:
 * - settings.pixelId: string with pattern validation (can type "abc123", shows error)
 * - settings.timeout: number with min/max (can type "abc", shows error)
 * - settings.apiKey: string with minLength
 *
 * Key: Always uses type="text" input, never type="number" to allow typing anything
 */
export interface MappingPrimitivePaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  schema?: RJSFSchema;
  uiSchema?: UiSchema;
  className?: string;
}

export function MappingPrimitivePaneView({
  path,
  mappingState,
  navigation,
  schema,
  uiSchema,
  className = '',
}: MappingPrimitivePaneViewProps) {
  const value = mappingState.actions.getValue(path);

  // Convert to string for editing
  const stringValue =
    value === null ? 'null' : value === undefined ? '' : String(value);

  // Determine field type from schema
  const fieldType = schema?.type || 'string';
  const isNumber = fieldType === 'number' || fieldType === 'integer';

  const handleChange = (newValue: string) => {
    // Empty string handling
    if (newValue === '') {
      mappingState.actions.setValue(path, '');
      return;
    }

    // Number type coercion
    if (isNumber) {
      const asNumber = Number(newValue);
      if (!isNaN(asNumber)) {
        mappingState.actions.setValue(path, asNumber);
        return;
      }
    }

    // Default to string (validation will show error if wrong type)
    mappingState.actions.setValue(path, newValue);
  };

  // Get field info from schema
  const title = schema?.title || path[path.length - 1];
  const description =
    schema?.description ||
    `${isNumber ? 'Number' : 'Text'} field${schema?.pattern ? ' with validation' : ''}`;

  const placeholder =
    uiSchema?.['ui:placeholder'] || schema?.examples?.[0] || undefined;

  // Validate current value
  const validationResult = validateValue(value, schema);
  const hasError = !validationResult.valid;

  return (
    <BaseMappingPane
      title={title}
      description={description}
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-pane-field">
        <MappingInput
          value={stringValue}
          onChange={handleChange}
          placeholder={placeholder}
          type="text"
          autoFocus
          error={hasError}
        />
        <div className="elb-mapping-pane-hint">
          Current type: <strong>{typeof value}</strong>
          {uiSchema?.['ui:help'] && (
            <>
              <br />
              {uiSchema['ui:help']}
            </>
          )}
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
    </BaseMappingPane>
  );
}

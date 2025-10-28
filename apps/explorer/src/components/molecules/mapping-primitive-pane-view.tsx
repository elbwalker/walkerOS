import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingInput } from '../atoms/mapping-input';
import { validateValue } from '../../utils/schema-validation';

/**
 * Primitive Pane View - Schema-driven editor for primitive values
 *
 * Styled like the value pane but with schema validation support:
 * - String fields (with pattern, minLength, maxLength validation)
 * - Number fields (with min, max validation)
 * - Schema-based hints and placeholders
 * - Real-time validation with error highlighting
 *
 * Examples:
 * - settings.pixelId: string with pattern validation (must be all digits)
 * - settings.timeout: number with min/max
 * - settings.apiKey: string with minLength
 *
 * Benefits over generic valueType pane:
 * - No confusing ValueConfig conversion tiles
 * - Schema validation with visual feedback
 * - Clean, consistent styling
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

  // Convert to string for editing (like value pane)
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

    // Default to string
    mappingState.actions.setValue(path, newValue);
  };

  // Get field info from schema
  const title = schema?.title || path[path.length - 1];
  const description =
    schema?.description ||
    `${isNumber ? 'Number' : 'Text'} field${schema?.pattern ? ' with validation' : ''}`;

  // Get placeholder from UI schema or schema
  const placeholder =
    uiSchema?.['ui:placeholder'] || schema?.examples?.[0] || undefined;

  // Build validation hints
  const hints: string[] = [];

  if (schema?.pattern) {
    hints.push(`Pattern: ${schema.pattern}`);
  }

  if (schema?.minLength !== undefined || schema?.maxLength !== undefined) {
    const parts: string[] = [];
    if (schema.minLength) parts.push(`min ${schema.minLength} chars`);
    if (schema.maxLength) parts.push(`max ${schema.maxLength} chars`);
    if (parts.length > 0) hints.push(parts.join(', '));
  }

  if (
    isNumber &&
    (schema?.minimum !== undefined || schema?.maximum !== undefined)
  ) {
    const parts: string[] = [];
    if (schema.minimum !== undefined) parts.push(`min ${schema.minimum}`);
    if (schema.maximum !== undefined) parts.push(`max ${schema.maximum}`);
    if (parts.length > 0) hints.push(`Range: ${parts.join(' - ')}`);
  }

  // Validate current value against schema
  const validationResult = validateValue(value, schema);
  const hasError = !validationResult.valid;

  // Current type indicator
  const currentType =
    value === null ? 'null' : value === undefined ? 'undefined' : typeof value;

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
          type={isNumber ? 'number' : 'text'}
          autoFocus
          error={hasError}
        />
        <div className="elb-mapping-pane-hint">
          Current type: <strong>{currentType}</strong>
          {hints.length > 0 && (
            <>
              <br />
              {hints.join(' • ')}
            </>
          )}
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

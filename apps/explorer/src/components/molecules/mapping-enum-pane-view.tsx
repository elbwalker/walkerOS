import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import type { DestinationSchemas } from '../organisms/mapping-box';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingEnumSelect } from '../atoms/mapping-enum-select';
import { navigateJsonSchema } from '../../utils/type-detector';

/**
 * Enum Pane View - Pure Presentation Component
 *
 * Edits enum fields with predefined options from JSON Schema.
 * Uses schema.enum to populate dropdown options and schema.type to determine
 * if freeform text input should be allowed.
 *
 * Features:
 * - Dropdown selection from schema-defined enum values
 * - Optional freeform text input for 'string' type enums
 * - Keyboard navigation
 * - Schema-driven: extracts enum values from destination schemas
 *
 * @example
 * // Path: ['order', 'complete', 'settings', 'track']
 * // Schema: { type: 'string', enum: ['PageView', 'Purchase', 'AddToCart'] }
 * <MappingEnumPaneView
 *   path={['order', 'complete', 'settings', 'track']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 *   schemas={{
 *     mapping: metaPixelMappingSchema,
 *     mappingUi: metaPixelMappingUiSchema
 *   }}
 * />
 */
export interface MappingEnumPaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  schemas?: DestinationSchemas;
  className?: string;
}

export function MappingEnumPaneView({
  path,
  mappingState,
  navigation,
  schemas,
  className = '',
}: MappingEnumPaneViewProps) {
  const value = mappingState.actions.getValue(path);
  const currentValue =
    typeof value === 'string' || typeof value === 'number' ? value : '';

  // Navigate schema to find enum options
  const schema = schemas?.mapping
    ? navigateJsonSchema(path, schemas.mapping)
    : null;

  const enumOptions = (schema?.enum as Array<string | number>) || [];
  const enumType = schema?.type === 'number' ? 'number' : 'string';

  const handleChange = (newValue: string | number) => {
    if (
      newValue === '' ||
      (typeof newValue === 'string' && newValue.trim() === '')
    ) {
      // Delete if empty
      mappingState.actions.deleteValue(path);
    } else {
      mappingState.actions.setValue(path, newValue);
    }
  };

  // Get field name from path (last segment)
  const fieldName = path[path.length - 1];

  return (
    <BaseMappingPane
      title={`Enum: ${fieldName}`}
      description="Select from dropdown or type custom value"
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-pane-field">
        <MappingEnumSelect
          value={currentValue}
          onChange={handleChange}
          options={enumOptions}
          placeholder={
            enumOptions.length > 0
              ? `Type or select ${fieldName}...`
              : 'Type custom value...'
          }
          type={enumType}
          autoFocus
        />
        <div className="elb-mapping-pane-hint">
          {enumOptions.length > 0
            ? `${enumOptions.length} predefined ${enumOptions.length === 1 ? 'option' : 'options'} available. Type to filter or enter custom value.`
            : 'No predefined options. Enter custom value.'}
        </div>
      </div>

      {enumOptions.length > 0 && (
        <div className="elb-mapping-enum-examples">
          <div className="elb-mapping-enum-examples-title">
            Available Options:
          </div>
          <ul className="elb-mapping-enum-examples-list">
            {enumOptions.slice(0, 10).map((option) => (
              <li key={String(option)}>
                <code>{String(option)}</code>
              </li>
            ))}
            {enumOptions.length > 10 && (
              <li className="elb-mapping-enum-examples-more">
                ... and {enumOptions.length - 10} more
              </li>
            )}
          </ul>
        </div>
      )}
    </BaseMappingPane>
  );
}

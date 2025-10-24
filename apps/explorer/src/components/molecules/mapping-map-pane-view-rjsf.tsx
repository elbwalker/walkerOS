import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * Map Pane View (RJSF) - Schema-driven version of map pane
 *
 * Drop-in replacement for MappingMapPaneView using RJSF objectExplorer widget.
 * Provides identical functionality but is schema-driven instead of hardcoded.
 *
 * Features (identical to original):
 * - Add new key-value pairs
 * - View configured properties as badges
 * - Navigate to individual key editors (ValueType pane)
 * - Delete keys
 * - Rename keys inline
 *
 * @example
 * <MappingMapPaneViewRJSF
 *   path={['product', 'view', 'data', 'map']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 * />
 */
export interface MappingMapPaneViewRJSFProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

export function MappingMapPaneViewRJSF({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingMapPaneViewRJSFProps) {
  // Get current map value
  const mapValue = mappingState.actions.getValue(path);
  const map =
    mapValue && typeof mapValue === 'object' && !Array.isArray(mapValue)
      ? (mapValue as Record<string, unknown>)
      : {};

  const mapKeys = Object.keys(map);

  // Schema for map - allows arbitrary keys
  const schema: RJSFSchema = {
    type: 'object',
    title: 'Map',
    additionalProperties: true, // Dynamic keys allowed
  };

  // UI Schema configures the objectExplorer field
  const uiSchema: UiSchema = {
    'ui:field': 'objectExplorer', // Use field for objects, not widget
    'ui:options': {
      allowAdd: true,
      allowRename: true,
      allowDelete: true,
      showBadges: true,
      childNodeType: 'valueType',
      emptyMessage: 'No keys yet. Add keys to transform event data.',
      placeholder: 'Type key name to create or select (e.g., currency)...',
    },
  };

  // Form context - provides navigation and state to widget
  const formContext = {
    navigation,
    mappingState,
    path,
  };

  // Handle changes from widget
  const handleChange = (newValue: unknown) => {
    if (newValue && typeof newValue === 'object' && !Array.isArray(newValue)) {
      mappingState.actions.setValue(path, newValue);
    } else if (
      newValue === null ||
      newValue === undefined ||
      (typeof newValue === 'object' && Object.keys(newValue).length === 0)
    ) {
      // Handle empty object or deletion
      mappingState.actions.deleteValue(path);
    }
  };

  return (
    <BaseMappingPane
      title="Map"
      description={
        mapKeys.length === 0
          ? 'No keys yet. Add keys to transform event data.'
          : `${mapKeys.length} ${mapKeys.length === 1 ? 'key' : 'keys'}`
      }
      navigation={navigation}
      className={className}
    >
      <MappingFormWrapper
        schema={schema}
        uiSchema={uiSchema}
        formData={map}
        onChange={handleChange}
        formContext={formContext}
      />
    </BaseMappingPane>
  );
}

import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { DestinationSchemas } from '../organisms/mapping-box';
import { navigateJsonSchema } from '../../utils/type-detector';

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
 * Schema-driven features:
 * - When schemas.data provided: Shows property suggestions from destination data schema
 * - When schemas.mapping provided: Shows property suggestions for settings paths
 * - Displays property descriptions and types as hints
 * - Automatically opens correct editors (enum, boolean, map, etc.) based on schema
 *
 * Path-based schema selection:
 * - data.map paths → uses schemas.data
 * - settings.map paths → uses schemas.mapping (navigates to nested properties)
 *
 * @example
 * // Data mapping with schema
 * <MappingMapPaneViewRJSF
 *   path={['product', 'view', 'data', 'map']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 *   schemas={{ data: dataSchema }}
 * />
 *
 * @example
 * // Settings mapping with schema
 * <MappingMapPaneViewRJSF
 *   path={['product', 'view', 'settings', 'map']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 *   schemas={{ mapping: mappingSchema }}
 * />
 */
export interface MappingMapPaneViewRJSFProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  schemas?: DestinationSchemas;
  className?: string;
}

export function MappingMapPaneViewRJSF({
  path,
  mappingState,
  navigation,
  schemas,
  className = '',
}: MappingMapPaneViewRJSFProps) {
  // Get current map value
  const mapValue = mappingState.actions.getValue(path);
  const map =
    mapValue && typeof mapValue === 'object' && !Array.isArray(mapValue)
      ? (mapValue as Record<string, unknown>)
      : {};

  const mapKeys = Object.keys(map);

  // Determine the last element of the path for detection logic
  const lastElement = path[path.length - 1];

  // Check if this is a data path to use dataSchema
  // Only for: ['entity', 'action', 'data'] or ['entity', 'action', 'data', 'map']
  const dataIndex = path.indexOf('data');
  const isDataPath =
    dataIndex !== -1 &&
    ((lastElement === 'data' && dataIndex === path.length - 1) ||
      (lastElement === 'map' && dataIndex === path.length - 2));

  // Check if this is a settings path to use mappingSchema
  // Handles: ['entity', 'action', 'settings'], ['entity', 'action', 'settings', 'map']
  // and nested: ['entity', 'action', 'settings', 'track'] or ['entity', 'action', 'settings', 'track', 'map']
  const settingsIndex = path.indexOf('settings');
  const isSettingsPath =
    settingsIndex !== -1 &&
    (lastElement === 'settings' ||
      (lastElement === 'map' && settingsIndex < path.length - 1));

  // Determine which schema to use for property suggestions
  let propertySuggestionsSchema: RJSFSchema | undefined;

  if (isDataPath) {
    // For data paths, use the dataSchema directly
    propertySuggestionsSchema = schemas?.data;
  } else if (isSettingsPath && schemas?.mapping) {
    // For settings paths, navigate to the appropriate schema

    // Case 1: ['entity', 'action', 'settings'] - direct settings object
    // Use the full mappingSchema to show track, trackCustom, etc.
    if (lastElement === 'settings' && settingsIndex === path.length - 1) {
      propertySuggestionsSchema = schemas.mapping;
    }
    // Case 2: ['entity', 'action', 'settings', 'map'] - explicit map under settings
    // Use the full mappingSchema
    else if (lastElement === 'map' && settingsIndex === path.length - 2) {
      propertySuggestionsSchema = schemas.mapping;
    }
    // Case 3: ['entity', 'action', 'settings', 'track', 'map'] - nested property under settings
    // Navigate to the nested schema
    else if (lastElement === 'map' && settingsIndex < path.length - 2) {
      const navigatedSchema = navigateJsonSchema(path, schemas.mapping);
      propertySuggestionsSchema = navigatedSchema || undefined;
    }
  }

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
      propertySuggestionsSchema, // Pass data schema for property suggestions
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

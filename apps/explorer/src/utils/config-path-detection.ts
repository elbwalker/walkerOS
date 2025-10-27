import type { NodeType } from '../hooks/useMappingNavigation';
import type { UseMappingStateReturn } from '../hooks/useMappingState';
import type { DestinationSchemas } from '../components/organisms/destination-box';
import { detectNodeType as detectNodeTypeFromValueAndSchema } from './type-detector';

/**
 * Get NodeType from path for DestinationBox (full config)
 *
 * Extends mapping path detection to handle root-level config properties:
 * - settings (config.settings)
 * - mapping (config.mapping) - delegates to existing logic
 * - data (config.data)
 * - policy (config.policy)
 * - consent (config.consent)
 * - options (root-level options)
 *
 * @param path - Path array to detect type for
 * @param configState - Config state management hook
 * @param schemas - Destination schemas
 * @returns NodeType for this path
 */
export function getNodeTypeFromConfigPath(
  path: string[],
  configState: UseMappingStateReturn,
  schemas?: DestinationSchemas,
): NodeType {
  // Empty path = overview
  if (path.length === 0) {
    return 'entity'; // Overview uses entity pane
  }

  const rootProperty = path[0];

  // ROOT-LEVEL CONFIG PROPERTIES

  // Settings section
  if (rootProperty === 'settings') {
    if (path.length === 1) {
      return 'settings'; // Settings overview
    }
    // Nested settings - use value detection with settings schema
    const value = configState.actions.getValue(path);
    return detectNodeTypeFromValueAndSchema(value, path, {
      ...schemas,
      mapping: schemas?.settings, // Use settings schema for nested detection
    });
  }

  // Mapping section - delegate to existing mapping logic
  if (rootProperty === 'mapping') {
    // Remove 'mapping' prefix and use existing logic
    const mappingPath = path.slice(1);
    return getNodeTypeFromMappingPath(mappingPath, configState, schemas, path);
  }

  // Data section
  if (rootProperty === 'data') {
    if (path.length === 1) {
      // Root data - detect based on value
      const value = configState.actions.getValue(path);
      return detectNodeTypeFromValueAndSchema(value, path, schemas);
    }
    // Nested data paths
    const value = configState.actions.getValue(path);
    return detectNodeTypeFromValueAndSchema(value, path, schemas);
  }

  // Policy section
  if (rootProperty === 'policy') {
    if (path.length === 1) {
      return 'policy'; // Policy overview
    }
    // Policy rule value
    return 'valueConfig';
  }

  // Consent section
  if (rootProperty === 'consent') {
    if (path.length === 1) {
      return 'consent'; // Consent overview
    }
    // Individual consent property (boolean)
    return 'boolean';
  }

  // Options section
  if (rootProperty === 'options') {
    return 'options'; // Options pane
  }

  // Fallback: assume this is a mapping path (backward compatibility)
  return getNodeTypeFromMappingPath(path, configState, schemas);
}

/**
 * Get NodeType from mapping path (existing logic)
 *
 * Handles traditional mapping structure:
 * - entity (depth 1)
 * - rule (depth 2)
 * - rule properties (depth 3+)
 *
 * @param path - Path within mapping
 * @param configState - Config state
 * @param schemas - Schemas
 * @param fullPath - Full path including 'mapping' prefix (for schema detection)
 * @returns NodeType
 */
function getNodeTypeFromMappingPath(
  path: string[],
  configState: UseMappingStateReturn,
  schemas?: DestinationSchemas,
  fullPath?: string[],
): NodeType {
  // Policy paths (special case)
  if (path.length === 1 && path[0] === 'policy') {
    return 'policy';
  }
  if (path.length >= 2 && path[0] === 'policy') {
    return 'valueConfig';
  }

  // Entity and rule paths (structure nodes)
  if (path.length === 1) {
    return 'entity';
  }
  if (path.length === 2) {
    return 'rule';
  }

  // Depth 3 - rule properties with dedicated panes
  if (path.length === 3) {
    const propertyName = path[2];
    if (propertyName === 'name') return 'name';
    if (propertyName === 'batch') return 'batch';
    if (propertyName === 'consent') return 'consent';

    // For data, settings, condition, ignore, etc. - use universal type detection
    // Fall through to three-tier detection below
  }

  // Universal type detection for depth 3+ values
  // Three-tier strategy: value → schema → default
  const value = configState.actions.getValue(fullPath || path);
  return detectNodeTypeFromValueAndSchema(value, fullPath || path, schemas);
}

import type { RJSFSchema } from '@rjsf/utils';

/**
 * Meta-schema defining the STRUCTURE of a DestinationConfig
 *
 * This is NOT the schema for the actual values (settings, mapping, etc.)
 * This IS the schema that describes what properties exist at the config root
 * and what type each section is.
 *
 * Purpose:
 * - Replace hardcoded path checks in getNodeTypeFromPath
 * - Make the system fully schema-driven
 * - Allow dynamic config structures
 *
 * The actual schemas for settings/mapping/data are passed separately
 * via DestinationSchemas.
 */
export const destinationConfigStructureSchema: RJSFSchema = {
  type: 'object',
  title: 'Destination Configuration',
  properties: {
    // Config-level settings (destination-specific)
    settings: {
      type: 'object',
      title: 'Settings',
      description: 'Destination-specific configuration',
      // Actual properties defined by destination schema
    },

    // Event mapping rules
    mapping: {
      type: 'object',
      title: 'Mapping',
      description: 'Event-specific mapping rules',
      // Special: uses entity → action pattern
      // Pattern: { [entity]: { [action]: Rule } }
    },

    // Global data transformations
    data: {
      title: 'Data',
      description: 'Global data transformations',
      // Type determined dynamically (can be map, loop, etc.)
    },

    // Processing policy
    policy: {
      type: 'object',
      title: 'Policy',
      description: 'Processing policy rules',
      additionalProperties: true,
    },

    // Consent requirements
    consent: {
      type: 'object',
      title: 'Consent',
      description: 'Consent requirements',
      additionalProperties: {
        type: 'boolean',
      },
    },

    // Config options
    id: {
      type: 'string',
      title: 'ID',
      description: 'Destination identifier',
    },

    loadScript: {
      type: 'boolean',
      title: 'Load Script',
      description: 'Automatically load destination script',
    },

    queue: {
      type: 'boolean',
      title: 'Queue',
      description: 'Enable event queuing',
    },

    verbose: {
      type: 'boolean',
      title: 'Verbose',
      description: 'Enable verbose logging',
    },
  },
};

/**
 * Map of root-level properties to their NodeTypes
 *
 * This replaces hardcoded switches in getNodeTypeFromPath.
 * For properties not in this map, use universal type detection.
 */
export const rootPropertyNodeTypes: Record<string, string> = {
  settings: 'settings', // Special: overview pane with property tiles
  mapping: 'entity', // Special: entity list
  policy: 'policy', // Special: policy overview pane
  consent: 'consent', // Special: consent pane
  // data, id, loadScript, queue, verbose use universal type detection
};

/**
 * Get NodeType for a root-level config property
 *
 * Uses schema + map instead of hardcoded switches.
 *
 * @param property - Root property name
 * @returns NodeType or undefined (use universal detection)
 */
export function getRootPropertyNodeType(property: string): string | undefined {
  return rootPropertyNodeTypes[property];
}

/**
 * Check if a property is a "mapping" prefix path
 *
 * Mapping paths need special handling because they have
 * entity → action hierarchy.
 *
 * @param path - Navigation path
 * @returns true if path starts with 'mapping'
 */
export function isMappingPath(path: string[]): boolean {
  return path.length > 0 && path[0] === 'mapping';
}

/**
 * Check if a path is a legacy mapping path (no 'mapping' prefix)
 *
 * For backward compatibility with existing MappingBox usage.
 *
 * @param path - Navigation path
 * @returns true if likely a legacy entity path
 */
export function isLegacyMappingPath(path: string[]): boolean {
  // If path[0] is not a known root property, assume legacy mapping
  const firstSegment = path[0];
  const knownRoots = [
    'settings',
    'mapping',
    'data',
    'policy',
    'consent',
    'id',
    'loadScript',
    'queue',
    'verbose',
  ];
  return !knownRoots.includes(firstSegment);
}

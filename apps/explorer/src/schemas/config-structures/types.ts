import type { NodeType } from '../../hooks/useMappingNavigation';

/**
 * Configuration Structure Definition
 *
 * Describes the SHAPE of a configuration object - what properties it has,
 * how they should be edited, and how to build tree navigation.
 *
 * This is NOT the schema for values (that's JSON Schema).
 * This IS the meta-schema that describes structure.
 *
 * Example:
 * - DESTINATION_CONFIG_STRUCTURE describes Destination.Config shape
 * - MAPPING_RULE_STRUCTURE describes Mapping.Rule shape
 * - VALUE_CONFIG_MAP_STRUCTURE describes ValueConfig.map shape
 */
export interface ConfigStructureDef {
  /** Type of the root config */
  type: 'object' | 'array' | 'primitive';

  /** Human-readable title */
  title?: string;

  /** Description of this config type */
  description?: string;

  /** Default NodeType for overview (when path is empty) */
  rootNodeType?: NodeType;

  /** Property definitions */
  properties?: Record<string, PropertyDef>;

  /** Special structural patterns */
  patterns?: {
    /** Entity → Action hierarchy (e.g., mapping.{entity}.{action}) */
    'entity-action'?: boolean;

    /** Dynamic keys allowed (e.g., map.{any-key}) */
    'dynamic-keys'?: boolean;
  };
}

/**
 * Property Definition
 *
 * Describes a single property within a config structure.
 */
export interface PropertyDef {
  /** Human-readable title */
  title?: string;

  /** Description of this property */
  description?: string;

  /** Explicit NodeType for editing this property */
  nodeType?: NodeType;

  /** Path to schema in schemas bundle (e.g., 'settings', 'mapping', 'id') */
  schemaPath?: string;

  /** How to build children for this property */
  children?: ChildrenStrategy;

  /** Nested structure definition (for complex properties) */
  structure?: ConfigStructureDef;

  /** Depth of this property in entity-action pattern */
  depth?: number;
}

/**
 * Children Building Strategy
 *
 * Determines how to build tree children for a property.
 */
export type ChildrenStrategy =
  | 'entity-action' // Special: mapping.{entity}.{action} pattern
  | 'schema-driven' // Build from JSON Schema properties
  | 'value-driven' // Detect from actual value structure
  | 'none'; // No children (leaf node)

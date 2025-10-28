import type { NodeType } from '../hooks/useMappingNavigation';
import type { RJSFSchema } from '@rjsf/utils';
import type {
  ConfigStructureDef,
  PropertyDef,
} from '../schemas/config-structures/types';
import {
  detectFromValue,
  detectFromJsonSchema,
  navigateSettingsSchema,
  navigateMappingSettingsSchema,
} from './type-detector';
import { MAPPING_RULE_STRUCTURE } from '../schemas/config-structures/mapping-rule';

/**
 * Tree node structure for config navigation
 */
export interface ConfigTreeNode {
  key: string;
  label: string;
  path: string[];
  type: NodeType;
  children?: ConfigTreeNode[];
  hasValue: boolean;
  isExpandable?: boolean;
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get schema for a nested path
 *
 * Handles special cases:
 * - Config-level settings: ['settings', 'pixelId'] → use schemas.settings
 * - Rule-level settings: ['mapping', 'page', 'view', 'settings', 'track'] → use schemas.mapping
 * - Direct rule settings: ['settings', 'track'] (when in rule context) → use schemas.mapping
 *
 * @param path - Full path from root
 * @param schemas - Available schemas dict
 * @returns Appropriate schema for the path, or undefined
 */
function getSchemaForNestedPath(
  path: string[],
  schemas?: Record<string, RJSFSchema>,
): RJSFSchema | undefined {
  if (!schemas) return undefined;

  // Config-level settings: ['settings', 'pixelId']
  if (path.length >= 2 && path[0] === 'settings' && schemas.settings) {
    return navigateSettingsSchema(path, schemas.settings) || undefined;
  }

  // Rule-level mapping settings: ['mapping', 'product', 'view', 'settings', 'track']
  if (path.includes('settings') && schemas.mapping) {
    return navigateMappingSettingsSchema(path, schemas.mapping) || undefined;
  }

  return undefined;
}

/**
 * Build tree structure from config using structure definition
 *
 * CONFIG-DRIVEN: Tree reflects actual config values, not schema possibilities.
 * STRUCTURE-AWARE: Uses PropertyDef for metadata (titles, nodeTypes, children strategy).
 *
 * @param config - Actual configuration object
 * @param structure - Structure definition describing config shape
 * @param schemas - Optional JSON Schemas for type hints and labels
 * @param sections - Optional visibility filter (e.g., { verbose: false })
 * @returns Array of root-level tree nodes
 *
 * @example
 * const tree = buildTree(
 *   destinationConfig,
 *   DESTINATION_CONFIG_STRUCTURE,
 *   metaPixelSchemas,
 *   { verbose: false }
 * );
 */
export function buildTree<T extends Record<string, unknown>>(
  config: T,
  structure: ConfigStructureDef,
  schemas?: Record<string, RJSFSchema>,
  sections?: Record<string, boolean>,
): ConfigTreeNode[] {
  const nodes: ConfigTreeNode[] = [];

  if (!structure.properties) {
    return nodes;
  }

  // Iterate actual config keys (config-driven, not schema-driven)
  const configKeys = Object.keys(config).filter(
    (key) => config[key] !== undefined,
  );

  for (const key of configKeys) {
    // Check section visibility
    if (sections?.[key] === false) {
      continue;
    }

    const propertyDef = structure.properties[key];
    const value = config[key];

    // Determine NodeType
    const nodeType =
      propertyDef?.nodeType ||
      detectNodeTypeFromValueOrSchema(value, schemas?.[key]);

    // Build node
    const node: ConfigTreeNode = {
      key,
      label: propertyDef?.title || capitalize(key),
      path: [key],
      type: nodeType,
      hasValue: true,
    };

    // Build children based on children strategy
    if (propertyDef?.children === 'entity-action') {
      // Special: mapping.{entity}.{action} pattern
      node.children = buildEntityActionChildren(
        value as Record<string, Record<string, unknown>>,
        [key],
        schemas,
      );
      node.isExpandable = node.children.length > 0;
    } else if (propertyDef?.children === 'schema-driven') {
      // Build from JSON Schema properties
      const propSchema = schemas?.[propertyDef.schemaPath || key];
      node.children = buildSchemaChildren(
        value as Record<string, unknown>,
        [key],
        propSchema,
        schemas,
        structure,
      );
      node.isExpandable = node.children.length > 0;
    } else if (propertyDef?.children === 'value-driven') {
      // Detect children from value structure
      node.children = buildValueChildren(value, [key], schemas);
      node.isExpandable = node.children.length > 0;
    } else {
      // No children (leaf node)
      node.isExpandable = false;
    }

    nodes.push(node);
  }

  return nodes;
}

/**
 * Build children nodes for entity-action pattern
 *
 * Handles the special mapping.{entity}.{action} hierarchy:
 * - First level: entities (page, product, order)
 * - Second level: actions (view, add, complete)
 * - Third level: rule properties (name, batch, settings, data, etc.)
 *
 * Uses MAPPING_RULE_STRUCTURE to properly handle rule properties with schema awareness.
 *
 * @param mapping - Mapping object (entity → action → rule)
 * @param basePath - Base path (e.g., ['mapping'])
 * @param schemas - Schemas dict for rule-level settings
 * @returns Array of entity nodes with action children
 */
function buildEntityActionChildren(
  mapping: Record<string, Record<string, unknown>>,
  basePath: string[],
  schemas?: Record<string, RJSFSchema>,
): ConfigTreeNode[] {
  const children: ConfigTreeNode[] = [];

  Object.keys(mapping).forEach((entity) => {
    const actions = mapping[entity];
    const actionNodes: ConfigTreeNode[] = [];

    if (actions && typeof actions === 'object') {
      Object.keys(actions).forEach((action) => {
        const ruleValue = actions[action];
        const rulePath = [...basePath, entity, action];

        // Build rule children using MAPPING_RULE_STRUCTURE for proper schema handling
        const ruleChildren = buildValueChildren(
          ruleValue,
          rulePath,
          schemas,
          MAPPING_RULE_STRUCTURE,
        );

        actionNodes.push({
          key: action,
          label: capitalize(action),
          path: rulePath,
          type: 'rule',
          hasValue: true,
          children: ruleChildren,
          isExpandable: ruleChildren.length > 0,
        });
      });
    }

    children.push({
      key: entity,
      label: capitalize(entity),
      path: [...basePath, entity],
      type: 'entity',
      hasValue: true,
      children: actionNodes,
      isExpandable: actionNodes.length > 0,
    });
  });

  return children;
}

/**
 * Build children from JSON Schema properties
 *
 * Used for settings and other schema-defined objects.
 * Only shows properties that actually exist in config.
 *
 * @param obj - Object with properties
 * @param basePath - Base path
 * @param schema - JSON Schema for this object
 * @param schemas - Full schemas dict for nested navigation
 * @param structure - Optional structure for additional metadata
 * @returns Array of child nodes
 */
function buildSchemaChildren(
  obj: Record<string, unknown>,
  basePath: string[],
  schema?: RJSFSchema,
  schemas?: Record<string, RJSFSchema>,
  structure?: ConfigStructureDef,
): ConfigTreeNode[] {
  const children: ConfigTreeNode[] = [];

  // Only build from actual config values (config-driven)
  Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .forEach((key) => {
      const value = obj[key];
      const childPath = [...basePath, key];
      const propSchema = schema?.properties?.[key] as RJSFSchema | undefined;

      // Determine children - check if nested object has schema
      let valueChildren: ConfigTreeNode[];
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        propSchema?.properties
      ) {
        // This is a schema-defined nested object, recurse with schema
        valueChildren = buildSchemaChildren(
          value as Record<string, unknown>,
          childPath,
          propSchema,
          schemas,
          structure,
        );
      } else {
        // Use value-driven for non-schema objects (pass structure!)
        valueChildren = buildValueChildren(
          value,
          childPath,
          schemas,
          structure,
        );
      }

      children.push({
        key,
        label: propSchema?.title || capitalize(key),
        path: childPath,
        // Schema-first detection: prioritize schema hints (enum, boolean, etc.) over value
        type: propSchema
          ? detectFromJsonSchema(propSchema)
          : detectFromValue(value),
        hasValue: true,
        children: valueChildren,
        isExpandable: valueChildren.length > 0,
      });
    });

  return children;
}

/**
 * Build children from value structure
 *
 * Used for data, policy, and other value-driven properties.
 * Detects structure from actual value, but uses schema when available.
 *
 * @param value - Value to inspect
 * @param basePath - Base path
 * @param schemas - Optional schemas dict for schema-aware navigation
 * @param structure - Optional structure definition for property metadata
 * @returns Array of child nodes
 */
function buildValueChildren(
  value: unknown,
  basePath: string[],
  schemas?: Record<string, RJSFSchema>,
  structure?: ConfigStructureDef,
): ConfigTreeNode[] {
  // For objects: show properties and recurse
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).map((key) => {
      const childValue = obj[key];
      const childPath = [...basePath, key];

      // Try to get schema for this path
      const childSchema = getSchemaForNestedPath(childPath, schemas);

      // Check if this property is defined in structure (for rule properties)
      const propertyDef = structure?.properties?.[key];

      // Determine if this should use schema-driven children
      let childChildren: ConfigTreeNode[];
      if (propertyDef?.children === 'schema-driven') {
        // Use schema-driven building for nested settings
        const schemaPath = propertyDef.schemaPath || key;
        const propSchema = schemas?.[schemaPath];
        childChildren = buildSchemaChildren(
          childValue as Record<string, unknown>,
          childPath,
          propSchema,
          schemas,
          structure,
        );
      } else {
        // Continue with value-driven recursion
        childChildren = buildValueChildren(
          childValue,
          childPath,
          schemas,
          structure,
        );
      }

      // Get label from schema or structure or fallback
      const label = childSchema?.title || propertyDef?.title || capitalize(key);

      // Get nodeType from structure, schema, or value detection
      const nodeType =
        propertyDef?.nodeType ||
        (childSchema
          ? detectFromJsonSchema(childSchema)
          : detectFromValue(childValue));

      return {
        key,
        label,
        path: childPath,
        type: nodeType,
        hasValue: true,
        children: childChildren,
        isExpandable: childChildren.length > 0,
      };
    });
  }

  // Arrays, primitives: no children
  return [];
}

/**
 * Determine NodeType from value or schema
 *
 * Helper that combines value introspection and schema detection.
 *
 * @param value - Value to inspect
 * @param schema - Optional JSON Schema
 * @returns Appropriate NodeType
 */
function detectNodeTypeFromValueOrSchema(
  value: unknown,
  schema?: RJSFSchema,
): NodeType {
  // Priority 1: Value introspection (if value exists)
  if (value !== undefined && value !== null) {
    return detectFromValue(value);
  }

  // Priority 2: Schema detection (if schema provided)
  if (schema) {
    return detectFromJsonSchema(schema);
  }

  // Priority 3: Default
  return 'valueType';
}

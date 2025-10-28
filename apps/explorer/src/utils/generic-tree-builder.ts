import type { NodeType } from '../hooks/useMappingNavigation';
import type { RJSFSchema } from '@rjsf/utils';
import type {
  ConfigStructureDef,
  PropertyDef,
} from '../schemas/config-structures/types';
import { detectFromValue, detectFromJsonSchema } from './type-detector';

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
      );
      node.isExpandable = node.children.length > 0;
    } else if (propertyDef?.children === 'schema-driven') {
      // Build from JSON Schema properties
      const propSchema = schemas?.[propertyDef.schemaPath || key];
      node.children = buildSchemaChildren(
        value as Record<string, unknown>,
        [key],
        propSchema,
      );
      node.isExpandable = node.children.length > 0;
    } else if (propertyDef?.children === 'value-driven') {
      // Detect children from value structure
      node.children = buildValueChildren(value, [key]);
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
 *
 * @param mapping - Mapping object (entity → action → rule)
 * @param basePath - Base path (e.g., ['mapping'])
 * @returns Array of entity nodes with action children
 */
function buildEntityActionChildren(
  mapping: Record<string, Record<string, unknown>>,
  basePath: string[],
): ConfigTreeNode[] {
  const children: ConfigTreeNode[] = [];

  Object.keys(mapping).forEach((entity) => {
    const actions = mapping[entity];
    const actionNodes: ConfigTreeNode[] = [];

    if (actions && typeof actions === 'object') {
      Object.keys(actions).forEach((action) => {
        actionNodes.push({
          key: action,
          label: capitalize(action),
          path: [...basePath, entity, action],
          type: 'rule',
          hasValue: true,
          isExpandable: false,
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
 * @returns Array of child nodes
 */
function buildSchemaChildren(
  obj: Record<string, unknown>,
  basePath: string[],
  schema?: RJSFSchema,
): ConfigTreeNode[] {
  const children: ConfigTreeNode[] = [];

  // Only build from actual config values (config-driven)
  Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .forEach((key) => {
      const propSchema = schema?.properties?.[key] as RJSFSchema | undefined;
      children.push({
        key,
        label: propSchema?.title || capitalize(key),
        path: [...basePath, key],
        type: detectNodeTypeFromValueOrSchema(obj[key], propSchema),
        hasValue: true,
        isExpandable: false,
      });
    });

  return children;
}

/**
 * Build children from value structure
 *
 * Used for data, policy, and other value-driven properties.
 * Detects structure from actual value.
 *
 * @param value - Value to inspect
 * @param basePath - Base path
 * @returns Array of child nodes
 */
function buildValueChildren(
  value: unknown,
  basePath: string[],
): ConfigTreeNode[] {
  // For objects: show properties
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).map((key) => ({
      key,
      label: capitalize(key),
      path: [...basePath, key],
      type: detectFromValue(obj[key]),
      hasValue: true,
      isExpandable: false,
    }));
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

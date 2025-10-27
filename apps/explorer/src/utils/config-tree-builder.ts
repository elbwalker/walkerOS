import type { NodeType } from '../hooks/useMappingNavigation';
import type { RJSFSchema } from '@rjsf/utils';
import type { Destination } from '@walkeros/core';
import type {
  DestinationConfig,
  DestinationSchemas,
  DestinationBoxSections,
} from '../components/organisms/destination-box';
import {
  destinationConfigStructureSchema,
  getRootPropertyNodeType,
} from '../schemas/destination-config-structure';

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
 * Build tree structure for destination config - FULLY SCHEMA-DRIVEN
 *
 * Uses destinationConfigStructureSchema to dynamically generate tree
 * based on actual config structure, not hardcoded sections.
 *
 * Strategy:
 * 1. Iterate through destinationConfigStructureSchema.properties
 * 2. For each property, check if value exists in config
 * 3. Build node with label from schema.title
 * 4. Determine NodeType using getRootPropertyNodeType() or universal detection
 * 5. Build children for complex types (settings, mapping)
 *
 * @param config - Full destination config
 * @param schemas - Destination schemas for property discovery
 * @param sections - Which sections to show (for filtering)
 * @returns Array of root-level tree nodes
 */
export function buildConfigTree<
  T extends Destination.TypesGeneric = Destination.Types,
>(
  config: DestinationConfig<T>,
  schemas?: DestinationSchemas,
  sections: DestinationBoxSections = {},
): ConfigTreeNode[] {
  const nodes: ConfigTreeNode[] = [];
  const structureSchema = destinationConfigStructureSchema;

  if (!structureSchema.properties) {
    return nodes;
  }

  // Iterate through schema properties to build tree dynamically
  const propertyKeys = Object.keys(structureSchema.properties);

  for (const key of propertyKeys) {
    // Check if this section is enabled (for known sections only)
    const sectionKey = key as keyof DestinationBoxSections;
    if (sections[sectionKey] === false) {
      continue;
    }

    const propertySchema = structureSchema.properties[key] as RJSFSchema;
    const configValue = (config as any)[key];

    // Determine if property has a value
    const hasValue = configValue !== undefined && configValue !== null;

    // Get NodeType for this property
    const nodeType =
      (getRootPropertyNodeType(key) as NodeType) || 'valueConfig';

    // Build node based on property type
    const node: ConfigTreeNode = {
      key,
      label: propertySchema.title || capitalize(key),
      path: [key],
      type: nodeType,
      hasValue,
    };

    // Build children for complex types
    if (key === 'settings' && hasValue) {
      // Settings: build children from actual config or schema
      node.children = buildSettingsChildren(
        configValue as Record<string, unknown>,
        schemas?.settings,
      );
      node.isExpandable = node.children.length > 0;
    } else if (key === 'mapping' && hasValue) {
      // Mapping: build entity → action hierarchy
      node.children = buildMappingChildren(
        configValue as Record<string, Record<string, unknown>>,
      );
      node.isExpandable = node.children.length > 0;
    } else if (propertySchema.type === 'object' && hasValue) {
      // Other objects (policy, consent): don't build children, open as pane
      node.isExpandable = false;
    } else {
      // Primitive values: not expandable
      node.isExpandable = false;
    }

    nodes.push(node);
  }

  return nodes;
}

/**
 * Build children nodes for settings
 */
function buildSettingsChildren(
  settings: Record<string, unknown>,
  schema?: RJSFSchema,
): ConfigTreeNode[] {
  const children: ConfigTreeNode[] = [];

  if (settings) {
    // Build from actual config values
    Object.keys(settings).forEach((key) => {
      children.push({
        key,
        label: capitalize(key),
        path: ['settings', key],
        type: 'valueConfig',
        hasValue: settings[key] !== undefined,
        isExpandable: false,
      });
    });
  } else if (schema?.properties) {
    // Build from schema (show available properties even if not configured)
    Object.keys(schema.properties).forEach((key) => {
      const propSchema = schema.properties![key] as RJSFSchema;
      children.push({
        key,
        label: propSchema.title || capitalize(key),
        path: ['settings', key],
        type: 'valueConfig',
        hasValue: false,
        isExpandable: false,
      });
    });
  }

  return children;
}

/**
 * Build children nodes for mapping (entity → action hierarchy)
 */
function buildMappingChildren(
  mapping: Record<string, Record<string, unknown>>,
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
          path: ['mapping', entity, action],
          type: 'rule',
          hasValue: true,
          isExpandable: false,
        });
      });
    }

    children.push({
      key: entity,
      label: capitalize(entity),
      path: ['mapping', entity],
      type: 'entity',
      hasValue: true,
      children: actionNodes,
      isExpandable: actionNodes.length > 0,
    });
  });

  return children;
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

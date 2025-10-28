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
 * Build tree structure for destination config - CONFIG-DRIVEN
 *
 * Builds tree from actual config values only (not schema possibilities).
 * Tree reflects what's in the JSON, just like MappingBox behavior.
 *
 * Strategy:
 * 1. Iterate through actual config keys (not schema)
 * 2. Build node with label from schema.title (if available) or capitalized key
 * 3. Determine NodeType using getRootPropertyNodeType() or universal detection
 * 4. Build children for complex types (settings, mapping) from actual values
 * 5. When property is deleted, it disappears from tree
 *
 * @param config - Full destination config
 * @param schemas - Destination schemas for labels/metadata
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

  // Iterate through actual config keys to build tree from real data
  const configKeys = Object.keys(config).filter(
    (key) => config[key as keyof typeof config] !== undefined,
  );

  for (const key of configKeys) {
    // Check if this section is enabled (for known sections only)
    const sectionKey = key as keyof DestinationBoxSections;
    if (sections[sectionKey] === false) {
      continue;
    }

    const propertySchema = structureSchema.properties[key] as
      | RJSFSchema
      | undefined;
    const configValue = (config as any)[key];

    // Get NodeType for this property
    const nodeType =
      (getRootPropertyNodeType(key) as NodeType) || 'valueConfig';

    // Build node based on property type
    const node: ConfigTreeNode = {
      key,
      label: propertySchema?.title || capitalize(key),
      path: [key],
      type: nodeType,
      hasValue: true,
    };

    // Build children for complex types
    if (key === 'settings' && configValue) {
      // Settings: build children from actual config values only
      node.children = buildSettingsChildren(
        configValue as Record<string, unknown>,
        schemas?.settings,
      );
      node.isExpandable = node.children.length > 0;
    } else if (key === 'mapping' && configValue) {
      // Mapping: build entity → action hierarchy from actual values
      node.children = buildMappingChildren(
        configValue as Record<string, Record<string, unknown>>,
      );
      node.isExpandable = node.children.length > 0;
    } else if (propertySchema?.type === 'object' && configValue) {
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
 * Build children nodes for settings - only show actual values
 */
function buildSettingsChildren(
  settings: Record<string, unknown>,
  schema?: RJSFSchema,
): ConfigTreeNode[] {
  const children: ConfigTreeNode[] = [];

  // Only build from actual config values
  Object.keys(settings)
    .filter((key) => settings[key] !== undefined)
    .forEach((key) => {
      const propSchema = schema?.properties?.[key] as RJSFSchema | undefined;
      children.push({
        key,
        label: propSchema?.title || capitalize(key),
        path: ['settings', key],
        type: 'valueConfig',
        hasValue: true,
        isExpandable: false,
      });
    });

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

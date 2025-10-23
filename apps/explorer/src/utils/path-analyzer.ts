import type { Mapping } from '@walkeros/core';

/**
 * Path Context Analyzer
 *
 * Provides structural understanding of mapping paths by walking the actual
 * config and inspecting values at each level.
 *
 * This is the single source of truth for understanding what a path points to
 * in the recursive mapping structure.
 */

/**
 * Structural type of a path segment
 */
export type SegmentStructuralType =
  | 'entity' // First level: entity name
  | 'action' // Second level: action name (points to Rule)
  | 'ruleProperty' // Property of a Rule object
  | 'valueConfigProperty' // Property of a ValueConfig object
  | 'mapKey' // Key in a map object
  | 'arrayIndex'; // Index in an array

/**
 * Semantic context of what's being edited
 */
export type SemanticContext =
  | 'overview' // Root level (no path)
  | 'entity' // Entity level (one segment)
  | 'rule' // Rule level (entity + action)
  | 'ruleProperty' // Property of rule (rule + property name)
  | 'valueConfig' // Editing a ValueConfig object
  | 'valueConfigProperty' // Property within ValueConfig
  | 'mapValue' // Value within a map
  | 'primitive'; // Primitive value (string, number, boolean)

/**
 * Information about a single segment in the path
 */
export interface PathSegmentInfo {
  segment: string;
  index: number;
  structuralType: SegmentStructuralType;
  value: unknown;
  parentValue: unknown;
}

/**
 * Complete analysis of a path through the mapping structure
 */
export interface PathAnalysis {
  segments: PathSegmentInfo[];
  finalValue: unknown;
  finalContext: SemanticContext;
  isRuleLevel: boolean;
  isValueConfigLevel: boolean;
  propertyName?: string;
}

/**
 * Type guard: Check if value is a Rule object
 */
export function isRule(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  // Rule has specific properties that ValueConfig doesn't have
  const ruleOnlyProps = [
    'name',
    'batch',
    'ignore',
    'settings',
    'batchFn',
    'batched',
  ];
  const valueConfigOnlyProps = ['key', 'fn', 'loop', 'set', 'validate'];

  const hasRuleProps = ruleOnlyProps.some((p) => p in obj);
  const hasValueConfigProps = valueConfigOnlyProps.some((p) => p in obj);

  // If it has rule-specific properties and no ValueConfig-only properties, it's a Rule
  return hasRuleProps && !hasValueConfigProps;
}

/**
 * Type guard: Check if value is a ValueConfig object
 */
export function isValueConfig(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  // ValueConfig markers - if ANY of these exist, it's a ValueConfig
  const markers = [
    'key',
    'value',
    'fn',
    'map',
    'loop',
    'set',
    'consent',
    'condition',
    'validate',
  ];
  return markers.some((m) => m in obj);
}

/**
 * Type guard: Check if value is a Map object (plain object inside ValueConfig.map)
 */
export function isMapObject(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  // A map is a plain object. We differentiate it from ValueConfig by checking
  // if it has ValueConfig markers. If no markers, it's a map.
  return !isValueConfig(value) && !isRule(value);
}

/**
 * Analyze a path through the mapping configuration
 *
 * Walks through the config structure, inspecting values at each step to
 * determine the semantic type and context.
 *
 * @param path - Array of path segments (e.g., ['page', 'view', 'data', 'map', 'page_location', 'consent'])
 * @param config - The mapping configuration object
 * @returns Complete analysis of the path
 *
 * @example
 * const analysis = analyzePath(['page', 'view', 'consent'], config);
 * // analysis.isRuleLevel === true (consent at rule level)
 *
 * @example
 * const analysis = analyzePath(['page', 'view', 'data', 'map', 'items', 'consent'], config);
 * // analysis.isValueConfigLevel === true (consent at ValueConfig level)
 */
export function analyzePath(
  path: string[],
  config: Mapping.Config,
): PathAnalysis {
  const segments: PathSegmentInfo[] = [];

  // Handle empty path (overview)
  if (path.length === 0) {
    return {
      segments: [],
      finalValue: config,
      finalContext: 'overview',
      isRuleLevel: false,
      isValueConfigLevel: false,
    };
  }

  let current: unknown = config;
  let parent: unknown = null;

  // Walk through each segment
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    parent = current;

    // Validate we can navigate
    if (!current || typeof current !== 'object') {
      throw new Error(
        `Cannot navigate path at index ${i}: value is not an object`,
      );
    }

    const obj = current as Record<string, unknown>;
    current = obj[segment];

    // Determine structural type based on context
    let structuralType: SegmentStructuralType;

    if (i === 0) {
      // First segment is always entity
      structuralType = 'entity';
    } else if (i === 1) {
      // Second segment is always action (points to Rule)
      structuralType = 'action';
    } else {
      // For deeper levels, inspect parent to determine type
      if (isRule(parent)) {
        structuralType = 'ruleProperty';
      } else if (isValueConfig(parent)) {
        structuralType = 'valueConfigProperty';
      } else if (Array.isArray(parent)) {
        structuralType = 'arrayIndex';
      } else {
        // Must be a map object
        structuralType = 'mapKey';
      }
    }

    segments.push({
      segment,
      index: i,
      structuralType,
      value: current,
      parentValue: parent,
    });
  }

  // Determine final context and metadata
  const lastSegment = segments[segments.length - 1];
  const finalValue = lastSegment.value;
  const parentValue = lastSegment.parentValue;

  let finalContext: SemanticContext;
  let isRuleLevel = false;
  let isValueConfigLevel = false;
  let propertyName: string | undefined;

  if (path.length === 1) {
    finalContext = 'entity';
  } else if (path.length === 2) {
    finalContext = 'rule';
  } else {
    // Deep path - determine based on structural type
    switch (lastSegment.structuralType) {
      case 'ruleProperty':
        finalContext = 'ruleProperty';
        isRuleLevel = true;
        propertyName = lastSegment.segment;
        break;

      case 'valueConfigProperty':
        finalContext = 'valueConfigProperty';
        isValueConfigLevel = true;
        propertyName = lastSegment.segment;
        break;

      case 'mapKey':
        // A map key holds a Value (string or ValueConfig)
        if (typeof finalValue === 'string') {
          finalContext = 'primitive';
        } else if (isValueConfig(finalValue)) {
          finalContext = 'valueConfig';
        } else {
          finalContext = 'mapValue';
        }
        break;

      default:
        finalContext = 'valueConfig';
    }
  }

  return {
    segments,
    finalValue,
    finalContext,
    isRuleLevel,
    isValueConfigLevel,
    propertyName,
  };
}

/**
 * Get semantic description for a path
 *
 * Returns human-readable description of what's being edited at this path.
 *
 * @example
 * getPathDescription(['page', 'view', 'consent'], config)
 * // Returns: "Rule-level consent for page view event"
 *
 * @example
 * getPathDescription(['page', 'view', 'data', 'map', 'title', 'consent'], config)
 * // Returns: "Property-level consent for title field"
 */
export function getPathDescription(
  path: string[],
  config: Mapping.Config,
): { title: string; description: string } {
  const analysis = analyzePath(path, config);

  if (analysis.propertyName === 'consent') {
    return {
      title: 'Required Consent States',
      description:
        'Events or properties will only be processed if these consent states are granted',
    };
  }

  // Default descriptions
  return {
    title: `Editing ${analysis.propertyName || 'Value'}`,
    description: `Configure ${analysis.finalContext} at path: ${path.join(' → ')}`,
  };
}

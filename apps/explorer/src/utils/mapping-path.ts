/**
 * Pure utility functions for mapping path navigation
 *
 * These functions handle:
 * - Path-based value extraction from nested objects
 * - Immutable path-based value updates
 * - Breadcrumb segment generation
 * - Rule path parsing (entity action format)
 * - Path validation and normalization
 *
 * All functions are pure (no side effects, no state, no UI)
 * Designed for maximum reusability across different UI implementations
 */

/**
 * Extract value from nested object using path array
 *
 * @example
 * getValueAtPath({ data: { map: { items: 'value' } } }, ['data', 'map', 'items'])
 * // Returns: 'value'
 *
 * @example
 * getValueAtPath({ data: {} }, ['data', 'missing'])
 * // Returns: undefined
 */
export function getValueAtPath(obj: unknown, path: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  if (path.length === 0) return obj;

  let current: unknown = obj;

  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Deep clone using JSON (works in all environments)
 * Note: Does not handle functions, symbols, undefined, etc.
 * Sufficient for mapping config which is JSON-serializable
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Set value in nested object at path (immutable)
 *
 * Creates a new object with the value updated at the specified path.
 * Does not mutate the original object.
 *
 * @example
 * setValueAtPath({ data: { map: {} } }, ['data', 'map', 'items'], 'new')
 * // Returns: { data: { map: { items: 'new' } } }
 */
export function setValueAtPath(
  obj: unknown,
  path: string[],
  value: unknown,
): unknown {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Cannot set value on non-object');
  }

  if (path.length === 0) return value;

  // Deep clone for immutability
  const cloned = deepClone(obj);

  let current: Record<string, unknown> = cloned as Record<string, unknown>;

  // Navigate to parent of target
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    // Create missing intermediate objects
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  // Set the final value
  const lastKey = path[path.length - 1];
  current[lastKey] = value;

  return cloned;
}

/**
 * Delete value at path (immutable)
 *
 * Creates a new object with the key removed at the specified path.
 * Does not mutate the original object.
 *
 * @example
 * deleteAtPath({ data: { map: { items: 'value' } } }, ['data', 'map', 'items'])
 * // Returns: { data: { map: {} } }
 */
export function deleteAtPath(obj: unknown, path: string[]): unknown {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Cannot delete from non-object');
  }

  if (path.length === 0) return undefined;

  const cloned = deepClone(obj);
  let current: Record<string, unknown> = cloned as Record<string, unknown>;

  // Navigate to parent
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key]) return cloned; // Path doesn't exist, return unchanged
    current = current[key] as Record<string, unknown>;
  }

  // Delete the final key
  const lastKey = path[path.length - 1];
  delete current[lastKey];

  return cloned;
}

/**
 * Parse rule path into entity and action
 *
 * WalkerOS uses "ENTITY ACTION" format with space separator
 *
 * @example
 * parseRulePath('product view')
 * // Returns: { entity: 'product', action: 'view' }
 *
 * @example
 * parseRulePath('invalid')
 * // Returns: { entity: 'invalid', action: undefined }
 */
export function parseRulePath(rulePath: string): {
  entity: string;
  action: string | undefined;
} {
  const parts = rulePath
    .trim()
    .split(' ')
    .filter((p) => p.trim());

  if (parts.length < 2) {
    return { entity: parts[0] || '', action: undefined };
  }

  const [entity, ...actionParts] = parts;
  return { entity, action: actionParts.join(' ') };
}

/**
 * Build rule path from entity and action
 *
 * @example
 * buildRulePath('product', 'view')
 * // Returns: 'product view'
 */
export function buildRulePath(entity: string, action: string): string {
  return `${entity} ${action}`;
}

/**
 * Breadcrumb segment for UI display
 */
export interface BreadcrumbSegment {
  label: string;
  path: string[];
  nodeType: 'root' | 'rule' | 'property' | 'nested';
}

/**
 * Build breadcrumb segments from path
 *
 * Converts a flat path array into human-readable breadcrumb segments
 *
 * @example
 * buildBreadcrumbSegments(['product', 'view', 'data', 'map', 'items'])
 * // Returns: [
 * //   { label: 'Root', path: [], nodeType: 'root' },
 * //   { label: 'product view', path: ['product', 'view'], nodeType: 'rule' },
 * //   { label: 'Data', path: ['product', 'view', 'data'], nodeType: 'property' },
 * //   { label: 'Map', path: ['product', 'view', 'data', 'map'], nodeType: 'nested' },
 * //   { label: 'items', path: ['product', 'view', 'data', 'map', 'items'], nodeType: 'nested' }
 * // ]
 */
export function buildBreadcrumbSegments(path: string[]): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [
    { label: 'Overview', path: [], nodeType: 'root' },
  ];

  if (path.length === 0) return segments;

  // First element is entity
  if (path.length >= 1) {
    segments.push({
      label: path[0],
      path: [path[0]],
      nodeType: 'rule',
    });
  }

  // Second element is action
  if (path.length >= 2) {
    segments.push({
      label: path[1],
      path: [path[0], path[1]],
      nodeType: 'rule',
    });
  }

  // Remaining elements are nested properties
  for (let i = 2; i < path.length; i++) {
    const key = path[i];
    const segmentPath = path.slice(0, i + 1);

    // Use lowercase for display
    const label = key;

    // Determine node type based on position
    const nodeType = i === 2 ? 'property' : 'nested';

    segments.push({
      label,
      path: segmentPath,
      nodeType,
    });
  }

  return segments;
}

/**
 * Validate if a path is valid for a mapping rule
 *
 * @example
 * isValidRulePath(['product', 'view'])
 * // Returns: true
 *
 * @example
 * isValidRulePath(['product'])
 * // Returns: false (missing action)
 */
export function isValidRulePath(path: string[]): boolean {
  if (path.length < 2) return false;

  const [entity, action] = path;
  if (!entity || !action) return false;
  if (typeof entity !== 'string' || typeof action !== 'string') return false;

  return true;
}

/**
 * Get parent path
 *
 * @example
 * getParentPath(['data', 'map', 'items'])
 * // Returns: ['data', 'map']
 *
 * @example
 * getParentPath(['data'])
 * // Returns: []
 *
 * @example
 * getParentPath([])
 * // Returns: []
 */
export function getParentPath(path: string[]): string[] {
  if (path.length === 0) return [];
  return path.slice(0, -1);
}

/**
 * Check if path is ancestor of another path
 *
 * @example
 * isAncestorPath(['data', 'map'], ['data', 'map', 'items'])
 * // Returns: true
 *
 * @example
 * isAncestorPath(['data', 'map'], ['data', 'set'])
 * // Returns: false
 */
export function isAncestorPath(
  ancestorPath: string[],
  descendantPath: string[],
): boolean {
  // Empty path cannot be ancestor (even though technically it is)
  if (ancestorPath.length === 0) return false;
  if (ancestorPath.length >= descendantPath.length) return false;

  for (let i = 0; i < ancestorPath.length; i++) {
    if (ancestorPath[i] !== descendantPath[i]) return false;
  }

  return true;
}

/**
 * Normalize path by removing empty strings and trimming
 *
 * @example
 * normalizePath(['  data  ', '', 'map', '  items'])
 * // Returns: ['data', 'map', 'items']
 */
export function normalizePath(path: string[]): string[] {
  return path
    .filter((segment) => segment && segment.trim())
    .map((s) => s.trim());
}

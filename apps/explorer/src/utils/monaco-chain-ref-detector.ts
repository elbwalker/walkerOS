import { getJsonPathAtOffset } from './monaco-json-path';

export type ChainKey = 'next' | 'before';

/**
 * Detects whether a JSON-path offset lies inside a value of a `next` or `before`
 * chain field. Handles scalar, inline array, multi-line array, and Route[] inner `next`.
 */
export function detectChainRefContext(
  fullText: string,
  offset: number,
): ChainKey | null {
  const path = getJsonPathAtOffset(fullText, offset);
  if (!path || path.length === 0) return null;
  const last = path[path.length - 1];
  const parent = path[path.length - 2];
  if (last === 'next' || last === 'before') return last;
  if (typeof last === 'number' && (parent === 'next' || parent === 'before')) {
    return parent;
  }
  return null;
}

/**
 * Detects whether the cursor's JSON path ends at the given key — useful for
 * scalar-valued keys like `"package"` that need multi-line-value awareness.
 */
export function detectKeyContext(
  fullText: string,
  offset: number,
  key: string,
): boolean {
  const path = getJsonPathAtOffset(fullText, offset);
  if (!path || path.length === 0) return false;
  return path[path.length - 1] === key;
}

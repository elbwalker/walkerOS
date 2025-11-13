/**
 * Type guard utilities for CLI package.
 *
 * Self-contained type checking helpers to avoid ESM/CJS interop issues
 * with runtime imports from @walkeros/core.
 */

/**
 * Type guard: Check if value is a plain object.
 *
 * @param value - Value to check
 * @returns True if value is a plain object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

// packages/core/src/setup.ts

/**
 * Normalize `config.setup` into a concrete options object, or null when disabled.
 *
 * - `false` / `undefined` → null (no setup)
 * - `true` → `defaults` as-is
 * - object → shallow merge of defaults and overrides (overrides win)
 */
export function resolveSetup<T extends object>(
  value: boolean | T | undefined,
  defaults: T,
): T | null {
  if (value === false || value === undefined) return null;
  if (value === true) return defaults;
  return { ...defaults, ...value };
}

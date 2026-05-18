// packages/core/src/transformer-entry.ts
export const TRANSFORMER_OPERATIVE_FIELDS = [
  'code',
  'package',
  'before',
  'next',
  'cache',
  'mapping',
] as const;

export type TransformerOperativeField =
  (typeof TRANSFORMER_OPERATIVE_FIELDS)[number];

export interface TransformerEntryValidation {
  ok: boolean;
  reason?: string;
  code?: 'UNKNOWN_KEY' | 'CONFLICT';
  key?: string;
}

const ALLOWED_KEYS = new Set<string>([
  ...TRANSFORMER_OPERATIVE_FIELDS,
  'config',
  'env',
  'validate',
  'variables',
  'examples',
  'disabled',
  'id',
  'logger',
  'mock',
  'chainMocks',
]);

export function validateTransformerEntry(
  entry: Record<string, unknown>,
): TransformerEntryValidation {
  // Closed schema: unknown keys are errors. This is the only validity rule.
  // Empty `{}` is intentionally allowed — pass-through is the default; an
  // entry with no fields is a no-op step, which causes no harm.
  for (const key of Object.keys(entry)) {
    if (!ALLOWED_KEYS.has(key)) {
      return {
        ok: false,
        code: 'UNKNOWN_KEY',
        key,
        reason: `Unknown key "${key}". Allowed: ${[...ALLOWED_KEYS].join(', ')}.`,
      };
    }
  }

  // Conflict: code + package
  if (entry.code !== undefined && entry.package !== undefined) {
    return {
      ok: false,
      code: 'CONFLICT',
      key: 'package',
      reason: 'Cannot specify both `code` and `package`. Use one or the other.',
    };
  }

  return { ok: true };
}

export function isPathTransformerEntry(
  entry: Record<string, unknown>,
): boolean {
  if (entry.code !== undefined || entry.package !== undefined) return false;
  return (
    entry.before !== undefined ||
    entry.next !== undefined ||
    entry.cache !== undefined ||
    entry.mapping !== undefined
  );
}

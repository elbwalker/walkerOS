import type { Flow } from './types/flow';

/**
 * Single source of truth for step-entry validation across all four kinds.
 *
 * An empty entry (no `code`, no `package`, no `import`) is a valid no-op
 * step for all four kinds. The bundler emits no code; the runtime skips
 * registration. No error is raised for empty steps.
 *
 * Error codes:
 * - UNKNOWN_KEY          unknown top-level key on a step entry
 * - CONFLICT             two of {code, package, import} together, or other mutually exclusive pairs
 * - MISSING_PACKAGE      `import` set without `package`
 * - OBSOLETE_CODE_STRING `code` is a string (legacy named-export shape; use `import` instead)
 * - INVALID_IMPORT       `import` is set but is not a valid JS identifier
 * - INVALID_CODE_SHAPE   `code` is present but is neither an object nor a string
 */

export const STEP_OPERATIVE_FIELDS: Record<Flow.StepKind, readonly string[]> = {
  Source: ['code', 'package', 'import', 'before', 'next', 'cache', 'state'],
  Transformer: [
    'code',
    'package',
    'import',
    'before',
    'next',
    'cache',
    'state',
    'mapping',
  ],
  Destination: [
    'code',
    'package',
    'import',
    'before',
    'next',
    'cache',
    'state',
  ],
  Store: ['code', 'package', 'import', 'cache'],
} as const;

const COMMON_NON_OPERATIVE = [
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
] as const;

const KIND_EXTRA: Record<Flow.StepKind, readonly string[]> = {
  Source: ['primary'],
  Transformer: [],
  Destination: [],
  Store: [],
};

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export type StepEntryErrorCode =
  | 'UNKNOWN_KEY'
  | 'CONFLICT'
  | 'MISSING_PACKAGE'
  | 'OBSOLETE_CODE_STRING'
  | 'INVALID_IMPORT'
  | 'INVALID_CODE_SHAPE';

export interface StepEntryValidation {
  ok: boolean;
  reason?: string;
  code?: StepEntryErrorCode;
  key?: string;
}

function allowedKeys(kind: Flow.StepKind): Set<string> {
  return new Set<string>([
    ...STEP_OPERATIVE_FIELDS[kind],
    ...COMMON_NON_OPERATIVE,
    ...KIND_EXTRA[kind],
  ]);
}

export function validateStepEntry(
  entry: Record<string, unknown>,
  kind: Flow.StepKind,
): StepEntryValidation {
  const allowed = allowedKeys(kind);

  for (const key of Object.keys(entry)) {
    if (!allowed.has(key)) {
      return {
        ok: false,
        code: 'UNKNOWN_KEY',
        key,
        reason: `Unknown key "${key}" on ${kind}. Allowed: ${[...allowed].sort().join(', ')}.`,
      };
    }
  }

  const hasPackage = entry.package !== undefined;
  const hasImport = entry.import !== undefined;
  const hasCode = entry.code !== undefined;

  if (hasCode && typeof entry.code === 'string') {
    return {
      ok: false,
      code: 'OBSOLETE_CODE_STRING',
      key: 'code',
      reason: `code: "<name>" is no longer supported. Use import: "${entry.code}" with the package field instead.`,
    };
  }

  if (
    hasCode &&
    ((typeof entry.code !== 'object' && typeof entry.code !== 'function') ||
      entry.code === null ||
      Array.isArray(entry.code))
  ) {
    return {
      ok: false,
      code: 'INVALID_CODE_SHAPE',
      key: 'code',
      reason: `code must be an object ({ push, type?, init? }) or a resolved function value.`,
    };
  }

  if (hasCode && hasPackage) {
    return {
      ok: false,
      code: 'CONFLICT',
      key: 'package',
      reason: 'Cannot specify both `code` and `package`. Use one or the other.',
    };
  }
  if (hasCode && hasImport) {
    return {
      ok: false,
      code: 'CONFLICT',
      key: 'import',
      reason: 'Cannot specify both `code` and `import`.',
    };
  }
  if (hasImport && !hasPackage) {
    return {
      ok: false,
      code: 'MISSING_PACKAGE',
      key: 'import',
      reason: '`import` requires `package` to be set.',
    };
  }
  if (hasImport) {
    if (typeof entry.import !== 'string' || !IDENT_RE.test(entry.import)) {
      return {
        ok: false,
        code: 'INVALID_IMPORT',
        key: 'import',
        reason: `import must match ${IDENT_RE.source}. Got: ${JSON.stringify(entry.import)}.`,
      };
    }
  }

  // Empty entry (no code, no package, no import) is a valid no-op step
  // for all four kinds. Bundler emits nothing, runtime skips registration.

  return { ok: true };
}

export function isPathStepEntry(
  entry: Record<string, unknown>,
  kind: Flow.StepKind,
): boolean {
  if (kind !== 'Transformer') return false;
  if (
    entry.code !== undefined ||
    entry.package !== undefined ||
    entry.import !== undefined
  ) {
    return false;
  }
  return (
    entry.before !== undefined ||
    entry.next !== undefined ||
    entry.cache !== undefined ||
    entry.state !== undefined ||
    entry.mapping !== undefined
  );
}

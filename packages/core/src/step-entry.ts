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

/**
 * The Flow step interface for each step kind.
 */
interface StepByKind {
  Source: Flow.Source;
  Transformer: Flow.Transformer;
  Destination: Flow.Destination;
  Store: Flow.Store;
}

/** A declared field name of the Flow step interface for `K`. */
export type StepField<K extends Flow.StepKind> = keyof StepByKind[K] & string;

/**
 * Lifecycle role of a declared step field.
 *
 * - `reference`: selects the implementation (`code`, `package`, `import`).
 *   The bundler turns it into the emitted `code` value; it is never emitted
 *   as-is.
 * - `resolve`: consumed by flow resolution (the variable cascade). Kept on the
 *   resolved flow, never emitted into a bundle.
 * - `docs`: consumed by validate/simulate/test tooling. Stripped at flow
 *   resolution, never emitted.
 * - `runtime`: must reach the collector unchanged, on every emission path
 *   (package step, inline code step, code-free path step).
 */
export type StepFieldRole = 'reference' | 'resolve' | 'docs' | 'runtime';

/**
 * Single source of truth for what happens to each declared step field between
 * the flow file and the running collector. Flow resolution (`getFlowSettings`)
 * and the CLI bundler both derive their field handling from this table instead
 * of hand-written field lists.
 *
 * Each entry is typed as a complete map over the Flow step interface, so adding
 * a field to `Flow.Source` / `Flow.Transformer` / `Flow.Destination` /
 * `Flow.Store` is a compile error here until the field is classified.
 */
export const STEP_FIELD_ROLES: {
  readonly [K in Flow.StepKind]: Readonly<Record<StepField<K>, StepFieldRole>>;
} = {
  Source: {
    package: 'reference',
    code: 'reference',
    import: 'reference',
    config: 'runtime',
    env: 'runtime',
    primary: 'runtime',
    before: 'runtime',
    next: 'runtime',
    cache: 'runtime',
    state: 'runtime',
    variables: 'resolve',
    examples: 'docs',
  },
  Transformer: {
    package: 'reference',
    code: 'reference',
    import: 'reference',
    config: 'runtime',
    env: 'runtime',
    before: 'runtime',
    next: 'runtime',
    cache: 'runtime',
    state: 'runtime',
    mapping: 'runtime',
    variables: 'resolve',
    examples: 'docs',
  },
  Destination: {
    package: 'reference',
    code: 'reference',
    import: 'reference',
    config: 'runtime',
    env: 'runtime',
    before: 'runtime',
    next: 'runtime',
    cache: 'runtime',
    state: 'runtime',
    variables: 'resolve',
    examples: 'docs',
  },
  Store: {
    package: 'reference',
    code: 'reference',
    import: 'reference',
    config: 'runtime',
    env: 'runtime',
    cache: 'runtime',
    variables: 'resolve',
    examples: 'docs',
  },
};

/**
 * Role of `field` on a step of `kind`, or `undefined` when the field is not a
 * declared Flow step field.
 */
export function getStepFieldRole(
  kind: Flow.StepKind,
  field: string,
): StepFieldRole | undefined {
  const roles: Readonly<Record<string, StepFieldRole>> = STEP_FIELD_ROLES[kind];
  return Object.prototype.hasOwnProperty.call(roles, field)
    ? roles[field]
    : undefined;
}

/**
 * The runtime fields of a step entry: every declared field classified as
 * `runtime` whose value is set. This is what the bundler must emit for the
 * step, whatever its emission path.
 */
export function getStepRuntimeProps(
  step: object,
  kind: Flow.StepKind,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(step)) {
    if (value === undefined || value === null) continue;
    if (getStepFieldRole(kind, key) === 'runtime') props[key] = value;
  }
  return props;
}

/**
 * Fields whose presence makes an entry operative (a real step rather than an
 * empty no-op). Each is a declared Flow step field; see `STEP_FIELD_ROLES` for
 * its lifecycle.
 */
export const STEP_OPERATIVE_FIELDS: {
  readonly [K in Flow.StepKind]: readonly StepField<K>[];
} = {
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
};

/**
 * Keys accepted on a step entry that are not declared Flow step fields. They
 * are runtime registration keys (`Collector` init shapes) that
 * `validateStepEntry` also checks; flow resolution does not carry them.
 */
const RUNTIME_ENTRY_EXTRA = [
  'disabled',
  'id',
  'logger',
  'mock',
  'chainMocks',
] as const;

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
    ...Object.keys(STEP_FIELD_ROLES[kind]),
    ...RUNTIME_ENTRY_EXTRA,
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
  return STEP_OPERATIVE_FIELDS.Transformer.some(
    (field) =>
      getStepFieldRole('Transformer', field) !== 'reference' &&
      entry[field] !== undefined,
  );
}

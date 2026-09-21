import { z } from './validation';
import { ValueSchema } from './mapping';

/**
 * StateSchema — declarative store get/set operation.
 *
 * Mirrors: types/state.ts → State
 *
 * - mode: 'get' | 'set' direction ('delete' is reserved for a later release).
 * - store: optional store id; defaults to the in-memory `__cache` store.
 * - key: Mapping.Value resolving against `{ event, ingest }` to the store key.
 *   Every path names its side with an `event.` or `ingest.` prefix.
 * - value: Mapping.Value. For `set` it resolves against `{ event, ingest }` to
 *   the payload to store; for `get` its string path (or `.key`) is the write
 *   target, `event.` onto the event or `ingest.` into the ingest. Optional
 *   at the type level (to keep a future `delete` mode non-breaking) but
 *   validation requires it for `get`/`set`, and for `get` it must be a bare
 *   string or a ValueConfig with a `key` (no `value`/`fn`/`map`/`loop`/`set`,
 *   and no `*` wildcard in the path).
 */
// A `set` payload may name a whole root (`event`). A key must resolve to a
// string and a `get` target must be writable, so both name a path in one.
const ROOT_PATH = /^(event|ingest)(\..+)?$/;
const ROOT_TARGET = /^(event|ingest)\..+$/;

/** The paths a Mapping.Value resolves directly: a string, a `.key`, or each entry of a fallback list. */
function topLevelPaths(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(topLevelPaths);
  if (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    typeof value.key === 'string'
  )
    return [value.key];
  return [];
}

function checkRootPaths(
  value: unknown,
  field: 'key' | 'value',
  ctx: z.RefinementCtx,
  allowed: RegExp,
): void {
  for (const path of topLevelPaths(value)) {
    if (allowed.test(path)) continue;
    ctx.addIssue({
      code: 'custom',
      message: `State paths resolve against { event, ingest }: "${path}" needs an "event." or "ingest." prefix.`,
      path: [field],
    });
  }
}

export const StateSchema = z
  .object({
    mode: z
      .enum(['get', 'set'])
      .describe("Direction: 'get' reads from the store, 'set' writes to it"),
    store: z
      .string()
      .optional()
      .describe(
        'Store id; defaults to the in-memory __cache store when omitted',
      ),
    key: ValueSchema.describe(
      'Resolves against { event, ingest } to the store key. Paths need an event. or ingest. prefix',
    ),
    value: ValueSchema.optional().describe(
      'set: resolves against { event, ingest } to the payload to store. get: its path is the write target, event. onto the event or ingest. into the ingest.',
    ),
  })
  .superRefine((data, ctx) => {
    checkRootPaths(data.key, 'key', ctx, ROOT_TARGET);

    if (data.value === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `\`value\` is required for mode "${data.mode}".`,
        path: ['value'],
      });
      return;
    }

    checkRootPaths(
      data.value,
      'value',
      ctx,
      data.mode === 'get' ? ROOT_TARGET : ROOT_PATH,
    );

    if (data.mode === 'get') {
      const value: unknown = data.value;
      let path: string | undefined;
      if (typeof value === 'string') {
        path = value;
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        'key' in value &&
        typeof value.key === 'string'
      ) {
        const extraKeys = ['value', 'fn', 'map', 'loop', 'set'].filter(
          (k) => k in value,
        );
        if (extraKeys.length > 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'For mode "get", `value` may only provide a `key` path.',
            path: ['value'],
          });
          return;
        }
        path = value.key;
      }

      if (path === undefined) {
        ctx.addIssue({
          code: 'custom',
          message:
            'For mode "get", `value` must be a bare string path or a ValueConfig with a `key` (no value/fn/map/loop/set).',
          path: ['value'],
        });
        return;
      }

      if (path.includes('*')) {
        ctx.addIssue({
          code: 'custom',
          message: 'For mode "get", the `value` path may not contain `*`.',
          path: ['value'],
        });
      }
    }
  })
  .meta({
    id: 'StateConfig',
    title: 'State.Config',
    description:
      'Declarative store operation: stash (set) or fetch (get) a value against a store. key names the store slot, value the event or ingest side, mode the direction. Paths resolve against { event, ingest }.',
  });

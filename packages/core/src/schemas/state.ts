import { z } from './validation';
import { ValueSchema } from './mapping';

/**
 * StateSchema — declarative store get/set operation.
 *
 * Mirrors: types/state.ts → State
 *
 * - mode: 'get' | 'set' direction ('delete' is reserved for a later release).
 * - store: optional store id; defaults to the in-memory `__cache` store.
 * - key: Mapping.Value resolving (against the event) to the store key.
 * - value: Mapping.Value. For `set` it resolves to the payload to store; for
 *   `get` its bare-string path (or `.key`) is the event write-target. Optional
 *   at the type level (to keep a future `delete` mode non-breaking) but
 *   validation requires it for `get`/`set`, and for `get` it must be a bare
 *   string or a ValueConfig with a `key` (no `value`/`fn`/`map`/`loop`/`set`,
 *   and no `*` wildcard in the path).
 */
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
    key: ValueSchema.describe('Resolves against the event to the store key'),
    value: ValueSchema.optional().describe(
      'set: resolves to the payload to store. get: its key/bare-string path is the event write-target.',
    ),
  })
  .superRefine((data, ctx) => {
    if (data.value === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `\`value\` is required for mode "${data.mode}".`,
        path: ['value'],
      });
      return;
    }

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
      'Declarative store operation: stash (set) or fetch (get) a value against a store. key = store side, value = event side, mode = direction.',
  });

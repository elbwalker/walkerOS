import type { Collector, Mapping, State, Store, WalkerOS } from './types';
import { getMappingValue } from './mapping';
import { FatalError } from './fatalError';
import { setByPath } from './byPath';
import { createMappingRoot } from './cache';
import { isArray, isDefined, isObject, isString } from './is';
import { tryCatchAsync } from './tryCatch';

/**
 * Resolve a store by id. An `undefined` id falls back to the default
 * in-memory `__cache` store. Returns `undefined` when the id is unknown.
 */
export type GetStore = (id: string | undefined) => Store.Instance | undefined;

/** Normalize a single State or an array of States to an array. */
export function compileState(state: State | State[]): State[] {
  return isArray(state) ? state : [state];
}

/** Extract the write-target path for a `get`. */
function resolveTargetPath(
  value: Mapping.Value | undefined,
): string | undefined {
  if (isString(value)) return value;
  if (isObject(value) && isString(value.key)) return value.key;
  return undefined;
}

/** Split a prefixed path into its side and the remaining path. */
function splitRootPath(
  path: string,
): { side: 'event' | 'ingest'; path: string } | undefined {
  const match = /^(event|ingest)\.(.+)$/.exec(path);
  if (!match) return undefined;
  return { side: match[1] === 'event' ? 'event' : 'ingest', path: match[2] };
}

/** The event's consent as a strict map, dropping unset entries. */
function eventConsent(
  event: WalkerOS.DeepPartialEvent,
): WalkerOS.Consent | undefined {
  if (!isObject(event.consent)) return undefined;
  const consent: WalkerOS.Consent = {};
  for (const [name, granted] of Object.entries(event.consent)) {
    if (typeof granted === 'boolean') consent[name] = granted;
  }
  return consent;
}

/**
 * Apply declarative store operations against an event, in array order,
 * sequentially.
 *
 * `key` and `value` resolve against `{ event, ingest }`, so every path names
 * its side: `event.user.session`, `ingest.site`. `get` reads from the store
 * and writes the fetched value to its `value` path: `event.x` onto the event
 * (immutably), `ingest.x` into the ingest in place. An ingest write is shared
 * by every event in the scope, so at a fan-out it loses per-event
 * attribution. `set` writes the resolved value to the store.
 *
 * Each entry is fail-open: a store or resolution error is logged and the
 * event is left unmutated, the chain continues. A key that does not resolve
 * warns; a store miss is silent. Only `FatalError` rethrows (via
 * `getMappingValue`).
 */
export async function applyState<E extends WalkerOS.DeepPartialEvent>(
  states: State[],
  getStore: GetStore,
  event: E,
  collector: Collector.Instance,
  ingest: Record<string, unknown> | undefined,
): Promise<E> {
  // One scratch object for the whole chain, so a later entry sees an earlier
  // ingest write even when the caller has no ingest.
  const scratch = ingest ?? {};
  let result = event;
  for (const entry of states) {
    await tryCatchAsync(
      async () => {
        const store = getStore(entry.store);
        if (!store) return; // unknown store is rejected at validation; guard anyway

        const root = createMappingRoot(scratch, result);
        // The root has no consent of its own; keep gating on the event's.
        const context = {
          collector,
          event: result,
          consent: eventConsent(result),
        };
        const rawKey = await getMappingValue(root, entry.key, context);
        if (!isString(rawKey)) {
          collector.logger?.warn?.('[state] key did not resolve', {
            mode: entry.mode,
            store: entry.store,
            key: entry.key,
          });
          return;
        }
        // namespace state keys on the shared default store to avoid cache collisions
        const key = entry.store ? rawKey : `state:${rawKey}`;

        if (entry.mode === 'set') {
          const payload = await getMappingValue(root, entry.value, context);
          if (!isDefined(payload)) return; // skip writing undefined
          await store.set(key, payload);
          return;
        }

        const targetPath = resolveTargetPath(entry.value);
        if (!targetPath) return; // validation already rejects this
        const target = splitRootPath(targetPath);
        if (!target) {
          collector.logger?.warn?.(
            '[state] get target needs an event. or ingest. prefix',
            { store: entry.store, value: targetPath },
          );
          return;
        }
        const fetched = await store.get(key);
        if (!isDefined(fetched)) return; // miss: leave event unchanged
        if (target.side === 'ingest') {
          setByPath(scratch, target.path, fetched, { mutable: true });
        } else {
          result = setByPath(result, target.path, fetched);
        }
      },
      (error) => {
        if (error instanceof FatalError) throw error;
        collector.logger?.error?.('[state] operation failed', error);
      },
    )();
  }
  return result;
}

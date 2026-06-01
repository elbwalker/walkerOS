import type { Collector, Mapping, State, Store, WalkerOS } from './types';
import { getMappingValue } from './mapping';
import { FatalError } from './fatalError';
import { setByPath } from './byPath';
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

/** Extract the event write-target path for a `get`. */
function resolveTargetPath(
  value: Mapping.Value | undefined,
): string | undefined {
  if (isString(value)) return value;
  if (isObject(value) && isString(value.key)) return value.key;
  return undefined;
}

/**
 * Apply declarative store operations against an event, in array order,
 * sequentially. `get` reads from the store and writes the fetched value to
 * the event's value path; `set` writes the resolved value to the store. Each
 * entry is fail-open: a store or resolution error is logged and the event is
 * left unmutated, the chain continues. Only `FatalError` rethrows (via
 * `getMappingValue`).
 */
export async function applyState<E extends WalkerOS.DeepPartialEvent>(
  states: State[],
  getStore: GetStore,
  event: E,
  collector: Collector.Instance,
): Promise<E> {
  let result = event;
  for (const entry of states) {
    await tryCatchAsync(
      async () => {
        const store = getStore(entry.store);
        if (!store) return; // unknown store is rejected at validation; guard anyway

        const rawKey = await getMappingValue(result, entry.key, {
          collector,
          event: result,
        });
        if (!isString(rawKey)) return;
        // namespace state keys on the shared default store to avoid cache collisions
        const key = entry.store ? rawKey : `state:${rawKey}`;

        if (entry.mode === 'set') {
          const payload = await getMappingValue(result, entry.value, {
            collector,
            event: result,
          });
          if (!isDefined(payload)) return; // skip writing undefined
          await store.set(key, payload);
        } else {
          const targetPath = resolveTargetPath(entry.value);
          if (!targetPath) return; // validation already rejects this
          const fetched = await store.get(key);
          if (!isDefined(fetched)) return; // miss: leave event unchanged
          result = setByPath(result, targetPath, fetched);
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

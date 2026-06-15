/**
 * Compile-time contract pin for `checkCache`'s return type.
 *
 * `checkCache` must always return a Promise. Sync returns are forbidden:
 * the `Store.GetFn` contract permits async backings (`T | undefined |
 * Promise<T | undefined>`), and a sync `checkCache` would surface a
 * Promise as the cached value.
 *
 * This file fails the TypeScript build if `checkCache` is ever un-async'd.
 */
import type { CacheResult } from '../cache';
import { checkCache } from '../cache';
import type { Cache, EventCacheRule, StoreCacheRule } from '../types/cache';

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

type Expect<T extends true> = T;

// Pin: checkCache returns Promise<CacheResult | null>.
type _CheckCacheReturnsPromise = Expect<
  Equal<ReturnType<typeof checkCache>, Promise<CacheResult | null>>
>;

void (null as unknown as _CheckCacheReturnsPromise);

// The discriminated cache-rule union must accept each rule shape and reject
// fields that belong only to the other variant. `update` is event-only; a
// StoreCacheRule carrying it must fail the build.
const _eventOk: Cache<EventCacheRule> = {
  rules: [{ key: ['event.id'], ttl: 60 }],
};
void _eventOk;

const _storeOk: Cache<StoreCacheRule> = {
  rules: [{ ttl: 60 }],
};
void _storeOk;

const _storeBad: Cache<StoreCacheRule> = {
  // @ts-expect-error -- update is not allowed in StoreCacheRule
  rules: [{ ttl: 60, update: { foo: 'bar' } }],
};
void _storeBad;

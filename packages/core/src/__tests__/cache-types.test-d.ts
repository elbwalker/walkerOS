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
import type { IsExactly, Expect } from '../schemas/__tests__/type-utils';

// Pin: checkCache returns Promise<CacheResult | null>.
type _CheckCacheReturnsPromise = Expect<
  IsExactly<ReturnType<typeof checkCache>, Promise<CacheResult | null>>
>;

void (null as unknown as _CheckCacheReturnsPromise);

// The discriminated cache-rule union must accept each rule shape and reject
// fields that belong only to the other variant. `update` is event-only; a
// StoreCacheRule carrying it must fail the build.
const _eventOk: Cache<EventCacheRule> = {
  // `update` is event-only; assert EventCacheRule accepts it so this file also
  // fails the build if the field is ever dropped from EventCacheRule.
  rules: [{ key: ['event.id'], ttl: 60, update: { foo: 'bar' } }],
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

import type { Cache, EventCacheRule, StoreCacheRule } from '../types/cache';

// Compile-time assertions: these should fail TS until the union exists.
const _eventOk: Cache<EventCacheRule> = {
  rules: [{ key: ['event.id'], ttl: 60 }],
};

const _storeOk: Cache<StoreCacheRule> = {
  rules: [{ ttl: 60 }],
};

const _storeBad: Cache<StoreCacheRule> = {
  // @ts-expect-error -- update is not allowed in StoreCacheRule
  rules: [{ ttl: 60, update: { foo: 'bar' } }],
};

it('compiles', () => {
  expect(true).toBe(true);
});

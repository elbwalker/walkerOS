import type { Flow } from '@walkeros/core';

/** Successful key retrieval from a populated store. */
export const getHit: Flow.StepExample = {
  description: 'Read an existing key from the memory store',
  in: { operation: 'get', key: 'session:abc123' },
  out: { value: { userId: 'usr_42', role: 'admin' } },
};

/** Write a value then read it back — full lifecycle. */
export const setAndGet: Flow.StepExample = {
  description: 'Write a key-value pair then read it back',
  in: {
    operation: 'set',
    key: 'cache:product:99',
    value: { name: 'Everyday Ruck Snack', price: 420 },
  },
  out: {
    operation: 'get',
    key: 'cache:product:99',
    value: { name: 'Everyday Ruck Snack', price: 420 },
  },
};

/** TTL entry expires and returns undefined on next access. */
export const ttlExpiration: Flow.StepExample = {
  description: 'Entry with TTL returns undefined after expiration',
  in: { operation: 'set', key: 'token:refresh', value: 'abc', ttl: 1000 },
  out: {
    operation: 'get',
    key: 'token:refresh',
    value: undefined,
    note: 'Accessed after 1000ms TTL expired',
  },
};

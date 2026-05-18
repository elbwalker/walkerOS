import { createCacheStore } from '../cache-store';

describe('__cache defaults (upgraded cache store)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('default maxEntries is 10000', () => {
    const store = createCacheStore();
    try {
      // Fill to maxEntries — none should be evicted yet.
      for (let i = 0; i < 10000; i++) {
        store.set(`k${i}`, i);
      }
      expect(store.counters.evictions_entries).toBe(0);
      // First key still present.
      expect(store.get('k0')).toBe(0);

      // Insert one more — triggers batched eviction.
      store.set('k10000', 10000);
      // After eviction, map should be at 0.8 * 10000 = 8000.
      // The freshly-inserted key plus any survivors stays.
      expect(store.counters.evictions_entries).toBeGreaterThan(0);
    } finally {
      store.destroy();
    }
  });

  it('FIFO when no LRU access: oldest-inserted evicts first', () => {
    const store = createCacheStore({ maxEntries: 10 });
    try {
      for (let i = 0; i < 10; i++) {
        store.set(`k${i}`, i);
      }
      // Trigger overflow by inserting one more.
      store.set('k10', 10);
      // Batched eviction trims to 80% (8 entries). The four oldest (k0..k3)
      // should be evicted plus we have one survivor space.
      // Actually: size hit 11, evict down to 8, so 3 oldest go (k0, k1, k2).
      expect(store.get('k0')).toBeUndefined();
      expect(store.get('k1')).toBeUndefined();
      expect(store.get('k2')).toBeUndefined();
      // k3 should survive.
      expect(store.get('k3')).toBe(3);
      // Latest inserted survives.
      expect(store.get('k10')).toBe(10);
    } finally {
      store.destroy();
    }
  });

  it('LRU: get moves entry to most-recent (older entry evicts first under pressure)', () => {
    const store = createCacheStore({ maxEntries: 10 });
    try {
      for (let i = 0; i < 10; i++) {
        store.set(`k${i}`, i);
      }
      // Touch k0 — it becomes most-recently-used.
      expect(store.get('k0')).toBe(0);
      // Trigger overflow.
      store.set('k10', 10);
      // After eviction to 80%, k0 should survive (was just accessed),
      // k1, k2, k3 should be the oldest insertion-order candidates.
      expect(store.get('k0')).toBe(0);
      expect(store.get('k1')).toBeUndefined();
      expect(store.get('k2')).toBeUndefined();
      expect(store.get('k3')).toBeUndefined();
      // k4 should survive (less old than k1-k3 after k0 moved).
      expect(store.get('k4')).toBe(4);
    } finally {
      store.destroy();
    }
  });

  it('batched eviction drops to 80% on overflow (not 1-by-1)', () => {
    const store = createCacheStore({ maxEntries: 100 });
    try {
      for (let i = 0; i < 100; i++) {
        store.set(`k${i}`, i);
      }
      // No eviction yet — size at cap.
      expect(store.counters.evictions_entries).toBe(0);
      // Trigger overflow.
      store.set('k100', 100);
      // Expect ~20% evicted in one batch (size hits 101, evict to 80).
      // After the batch the new key is inserted, so resulting size = 80 + 1
      // OR the implementation may evict BEFORE the new insert; in that case
      // size = 80 then +1 = 81. Both are acceptable: assert at most 81.
      expect(store.counters.evictions_entries).toBeGreaterThanOrEqual(20);
      expect(store.counters.evictions_entries).toBeLessThanOrEqual(21);
    } finally {
      store.destroy();
    }
  });

  it('active TTL sweep removes expired unread entries', () => {
    jest.useFakeTimers();
    const store = createCacheStore();
    try {
      store.set('a', 1, 1000); // expires in 1 second
      store.set('b', 2, 1000);
      store.set('c', 3, 120000); // expires in 2 minutes — outlives the sweep

      // Advance past TTL but before the first sweep interval.
      jest.advanceTimersByTime(2000);
      // No sweep yet — entries still present in raw map (not accessed via get).
      expect(store.counters.evictions_ttl).toBe(0);

      // Advance past the sweep interval (60s default).
      jest.advanceTimersByTime(60000);
      // The sweep should have run and removed a and b.
      expect(store.counters.evictions_ttl).toBeGreaterThanOrEqual(2);
      // Accessing a/b should now miss (sweep removed them).
      expect(store.get('a')).toBeUndefined();
      expect(store.get('b')).toBeUndefined();
      // c should survive.
      expect(store.get('c')).toBe(3);
    } finally {
      store.destroy();
    }
  });

  it('counters: hits, misses, populates, writes, deletes, evictions_entries, evictions_ttl increment correctly', () => {
    const store = createCacheStore({ maxEntries: 5 });
    try {
      // Initial counters all zero.
      expect(store.counters).toEqual({
        hits: 0,
        misses: 0,
        populates: 0,
        writes: 0,
        deletes: 0,
        evictions_entries: 0,
        evictions_ttl: 0,
      });

      // Miss.
      expect(store.get('absent')).toBeUndefined();
      expect(store.counters.misses).toBe(1);

      // Write (populate, since key didn't exist before).
      store.set('k1', 'v1');
      expect(store.counters.populates).toBe(1);
      expect(store.counters.writes).toBe(1);

      // Hit.
      expect(store.get('k1')).toBe('v1');
      expect(store.counters.hits).toBe(1);

      // Overwrite (write but not populate, since key existed).
      store.set('k1', 'v1b');
      expect(store.counters.writes).toBe(2);
      expect(store.counters.populates).toBe(1);

      // Delete.
      store.delete('k1');
      expect(store.counters.deletes).toBe(1);

      // Fill + overflow to trigger evictions_entries.
      for (let i = 0; i < 6; i++) {
        store.set(`f${i}`, i);
      }
      expect(store.counters.evictions_entries).toBeGreaterThan(0);
    } finally {
      store.destroy();
    }
  });

  it('destroy() clears the sweep interval', () => {
    jest.useFakeTimers();
    const store = createCacheStore();
    const clearSpy = jest.spyOn(global, 'clearInterval');
    store.destroy();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('get on expired entry deletes lazily and counts evictions_ttl', () => {
    jest.useFakeTimers();
    const store = createCacheStore();
    try {
      store.set('a', 1, 100);
      jest.advanceTimersByTime(200);
      expect(store.get('a')).toBeUndefined();
      // Lazy TTL eviction counted.
      expect(store.counters.evictions_ttl).toBeGreaterThanOrEqual(1);
    } finally {
      store.destroy();
    }
  });
});

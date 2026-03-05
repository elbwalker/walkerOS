import { createMemoryStore } from '../store';

describe('Memory Store', () => {
  describe('get/set basics', () => {
    it('should store and retrieve a value', () => {
      const store = createMemoryStore();
      store.set('key1', { body: 'hello' }, 60);
      expect(store.get('key1')).toEqual({ body: 'hello' });
    });

    it('should return undefined for missing key', () => {
      const store = createMemoryStore();
      expect(store.get('missing')).toBeUndefined();
    });

    it('should overwrite existing key', () => {
      const store = createMemoryStore();
      store.set('key1', { body: 'old' }, 60);
      store.set('key1', { body: 'new' }, 60);
      expect(store.get('key1')).toEqual({ body: 'new' });
    });
  });

  describe('TTL expiration', () => {
    it('should return undefined for expired entries', () => {
      jest.useFakeTimers();
      const store = createMemoryStore();
      store.set('key1', { body: 'data' }, 1); // 1 second TTL
      jest.advanceTimersByTime(1001);
      expect(store.get('key1')).toBeUndefined();
      jest.useRealTimers();
    });

    it('should return value before expiration', () => {
      jest.useFakeTimers();
      const store = createMemoryStore();
      store.set('key1', { body: 'data' }, 10);
      jest.advanceTimersByTime(5000);
      expect(store.get('key1')).toEqual({ body: 'data' });
      jest.useRealTimers();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxSize exceeded', () => {
      // Small maxSize to trigger eviction
      const store = createMemoryStore(50);
      store.set('key1', { body: 'a'.repeat(20) }, 60);
      store.set('key2', { body: 'b'.repeat(20) }, 60);
      store.set('key3', { body: 'c'.repeat(20) }, 60);

      // key1 should be evicted (oldest, exceeded size)
      expect(store.get('key1')).toBeUndefined();
      expect(store.get('key3')).toBeDefined();
    });

    it('should refresh access order on get', () => {
      // 15 chars * 2 bytes = 30 bytes each, maxSize=70 fits 2 but not 3
      const store = createMemoryStore(70);
      store.set('key1', { body: 'a'.repeat(15) }, 60);
      store.set('key2', { body: 'b'.repeat(15) }, 60);

      // Access key1 to make it most recently used
      store.get('key1');

      // Add key3 which should evict key2 (least recently used)
      store.set('key3', { body: 'c'.repeat(15) }, 60);

      expect(store.get('key1')).toBeDefined();
      expect(store.get('key2')).toBeUndefined();
    });
  });

  describe('size estimation', () => {
    it('should estimate string body size', () => {
      const store = createMemoryStore();
      store.set('key1', { body: 'hello' }, 60);
      expect(store.size()).toBeGreaterThan(0);
    });

    it('should estimate object body size via JSON', () => {
      const store = createMemoryStore();
      store.set('key1', { body: { foo: 'bar' } }, 60);
      expect(store.size()).toBeGreaterThan(0);
    });

    it('should track size across multiple entries', () => {
      const store = createMemoryStore();
      store.set('key1', { body: 'hello' }, 60);
      const size1 = store.size();
      store.set('key2', { body: 'world' }, 60);
      expect(store.size()).toBeGreaterThan(size1);
    });
  });
});

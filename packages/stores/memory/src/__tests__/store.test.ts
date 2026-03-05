import { createMemoryStore } from '../store';

describe('MemoryStore', () => {
  describe('get/set basics', () => {
    it('should store and retrieve a value', () => {
      const store = createMemoryStore<string>();
      store.set('key1', 'hello');
      expect(store.get('key1')).toBe('hello');
    });

    it('should return undefined for missing key', () => {
      const store = createMemoryStore<string>();
      expect(store.get('missing')).toBeUndefined();
    });

    it('should overwrite existing key', () => {
      const store = createMemoryStore<string>();
      store.set('key1', 'old');
      store.set('key1', 'new');
      expect(store.get('key1')).toBe('new');
    });

    it('should store object values', () => {
      const store = createMemoryStore<{ name: string }>();
      store.set('user', { name: 'Alice' });
      expect(store.get('user')).toEqual({ name: 'Alice' });
    });

    it('should expose type as memory', () => {
      const store = createMemoryStore<string>();
      expect(store.type).toBe('memory');
    });
  });

  describe('delete', () => {
    it('should remove a key', () => {
      const store = createMemoryStore<string>();
      store.set('key1', 'hello');
      store.delete('key1');
      expect(store.get('key1')).toBeUndefined();
    });

    it('should be a no-op for missing key', () => {
      const store = createMemoryStore<string>();
      expect(() => store.delete('missing')).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should clear all entries', () => {
      const store = createMemoryStore<string>();
      store.set('a', '1');
      store.set('b', '2');
      store.destroy!();
      expect(store.get('a')).toBeUndefined();
      expect(store.get('b')).toBeUndefined();
    });
  });

  describe('TTL expiration (milliseconds)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should return undefined for expired entries', () => {
      const store = createMemoryStore<string>();
      store.set('key1', 'data', 1000);
      jest.advanceTimersByTime(1001);
      expect(store.get('key1')).toBeUndefined();
    });

    it('should return value before expiration', () => {
      const store = createMemoryStore<string>();
      store.set('key1', 'data', 5000);
      jest.advanceTimersByTime(3000);
      expect(store.get('key1')).toBe('data');
    });

    it('should never expire entries without TTL', () => {
      const store = createMemoryStore<string>();
      store.set('key1', 'data');
      jest.advanceTimersByTime(999999999);
      expect(store.get('key1')).toBe('data');
    });

    it('should handle TTL of 0 as immediate expiration', () => {
      const store = createMemoryStore<string>();
      store.set('key1', 'data', 0);
      jest.advanceTimersByTime(1);
      expect(store.get('key1')).toBeUndefined();
    });
  });

  describe('LRU eviction by maxSize', () => {
    it('should evict oldest entry when maxSize exceeded', () => {
      const store = createMemoryStore<string>({ maxSize: 100 });
      store.set('key1', 'a'.repeat(40));
      store.set('key2', 'b'.repeat(40));
      store.set('key3', 'c'.repeat(40));
      expect(store.get('key1')).toBeUndefined();
      expect(store.get('key3')).toBeDefined();
    });

    it('should refresh access order on get (LRU)', () => {
      const store = createMemoryStore<string>({ maxSize: 100 });
      store.set('key1', 'a'.repeat(30));
      store.set('key2', 'b'.repeat(30));
      store.get('key1');
      store.set('key3', 'c'.repeat(30));
      expect(store.get('key1')).toBeDefined();
      expect(store.get('key2')).toBeUndefined();
    });
  });

  describe('maxEntries eviction', () => {
    it('should evict oldest entry when maxEntries exceeded', () => {
      const store = createMemoryStore<string>({ maxEntries: 2 });
      store.set('a', '1');
      store.set('b', '2');
      store.set('c', '3');
      expect(store.get('a')).toBeUndefined();
      expect(store.get('b')).toBe('2');
      expect(store.get('c')).toBe('3');
    });
  });

  describe('config', () => {
    it('should expose config with defaults', () => {
      const store = createMemoryStore<string>();
      expect(store.config.maxSize).toBe(10 * 1024 * 1024);
    });

    it('should expose custom config', () => {
      const store = createMemoryStore<string>({ maxSize: 500, maxEntries: 10 });
      expect(store.config.maxSize).toBe(500);
      expect(store.config.maxEntries).toBe(10);
    });
  });
});

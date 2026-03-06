import { createMockStore } from '../mock';

describe('MockStore', () => {
  it('should store and retrieve values', () => {
    const store = createMockStore<string>();
    store.set('key1', 'hello');
    expect(store.get('key1')).toBe('hello');
  });

  it('should return undefined for missing key', () => {
    const store = createMockStore<string>();
    expect(store.get('missing')).toBeUndefined();
  });

  it('should delete values', () => {
    const store = createMockStore<string>();
    store.set('key1', 'hello');
    store.delete('key1');
    expect(store.get('key1')).toBeUndefined();
  });

  it('should expose type as mock', () => {
    const store = createMockStore<string>();
    expect(store.type).toBe('mock');
  });

  describe('operation tracking', () => {
    it('should track get operations', () => {
      const store = createMockStore<string>();
      store.set('a', '1');
      store.get('a');
      store.get('b');
      expect(store._gets).toEqual(['a', 'b']);
    });

    it('should track set operations', () => {
      const store = createMockStore<string>();
      store.set('a', '1');
      store.set('b', '2', 5000);
      expect(store._sets).toEqual([
        { key: 'a', value: '1', ttl: undefined },
        { key: 'b', value: '2', ttl: 5000 },
      ]);
    });

    it('should track delete operations', () => {
      const store = createMockStore<string>();
      store.delete('a');
      expect(store._deletes).toEqual(['a']);
    });

    it('should clear tracking on destroy', () => {
      const store = createMockStore<string>();
      store.set('a', '1');
      store.get('a');
      store.delete('a');
      store.destroy!();
      expect(store._gets).toEqual([]);
      expect(store._sets).toEqual([]);
      expect(store._deletes).toEqual([]);
    });
  });
});

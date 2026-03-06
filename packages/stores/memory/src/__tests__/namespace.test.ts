import { createMockStore } from '../mock';
import { withNamespace } from '../namespace';

describe('withNamespace', () => {
  it('should prefix keys on set', () => {
    const inner = createMockStore<string>();
    const ns = withNamespace(inner, 'session');
    ns.set('user', 'alice');
    expect(inner._sets[0].key).toBe('session:user');
  });

  it('should prefix keys on get', () => {
    const inner = createMockStore<string>();
    const ns = withNamespace(inner, 'session');
    inner.set('session:user', 'alice');
    expect(ns.get('user')).toBe('alice');
  });

  it('should prefix keys on delete', () => {
    const inner = createMockStore<string>();
    const ns = withNamespace(inner, 'cache');
    ns.delete('key1');
    expect(inner._deletes[0]).toBe('cache:key1');
  });

  it('should pass through TTL', () => {
    const inner = createMockStore<string>();
    const ns = withNamespace(inner, 'ns');
    ns.set('key', 'val', 5000);
    expect(inner._sets[0]).toEqual({ key: 'ns:key', value: 'val', ttl: 5000 });
  });

  it('should delegate destroy to inner store', () => {
    const inner = createMockStore<string>();
    inner.set('a', '1');
    const ns = withNamespace(inner, 'ns');
    ns.destroy!();
    expect(inner.get('a')).toBeUndefined();
  });
});

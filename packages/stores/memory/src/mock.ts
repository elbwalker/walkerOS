export interface MockStoreInstance<T> {
  type: 'mock';
  config: Record<string, never>;
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  destroy(): void;
  _gets: string[];
  _sets: Array<{ key: string; value: T; ttl: number | undefined }>;
  _deletes: string[];
}

export function createMockStore<T = unknown>(): MockStoreInstance<T> {
  const data = new Map<string, T>();
  let _gets: string[] = [];
  let _sets: Array<{ key: string; value: T; ttl: number | undefined }> = [];
  let _deletes: string[] = [];

  return {
    type: 'mock',
    config: {},
    get _gets() {
      return _gets;
    },
    get _sets() {
      return _sets;
    },
    get _deletes() {
      return _deletes;
    },

    get(key: string): T | undefined {
      _gets.push(key);
      return data.get(key);
    },
    set(key: string, value: T, ttl?: number): void {
      _sets.push({ key, value, ttl });
      data.set(key, value);
    },
    delete(key: string): void {
      _deletes.push(key);
      data.delete(key);
    },
    destroy(): void {
      data.clear();
      _gets = [];
      _sets = [];
      _deletes = [];
    },
  };
}

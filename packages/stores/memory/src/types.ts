export interface MemoryStoreOptions {
  maxSize?: number;
  maxEntries?: number;
}

export interface MemoryStoreConfig {
  maxSize: number;
  maxEntries?: number;
}

export interface MemoryStoreInstance<T> {
  type: 'memory';
  config: MemoryStoreConfig;
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  destroy(): void;
}

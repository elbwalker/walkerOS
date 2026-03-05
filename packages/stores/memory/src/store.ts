import type { MemoryStoreOptions, MemoryStoreInstance } from './types';

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface StoreEntry<T> {
  value: T;
  expiresAt: number; // 0 = no expiration
  size: number;
}

function estimateSize<T>(key: string, value: T): number {
  const valueSize =
    typeof value === 'string' ? value.length : JSON.stringify(value).length;
  return valueSize + key.length;
}

export function createMemoryStore<T = unknown>(
  options: MemoryStoreOptions = {},
): MemoryStoreInstance<T> {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const maxEntries = options.maxEntries;
  const entries = new Map<string, StoreEntry<T>>();
  let totalSize = 0;

  function evictBySize(needed: number) {
    for (const [key, entry] of entries) {
      if (totalSize + needed <= maxSize) break;
      totalSize -= entry.size;
      entries.delete(key);
    }
  }

  function evictByEntries() {
    if (maxEntries === undefined) return;
    while (entries.size >= maxEntries) {
      const oldest = entries.keys().next();
      if (oldest.done) break;
      const entry = entries.get(oldest.value);
      if (entry) totalSize -= entry.size;
      entries.delete(oldest.value);
    }
  }

  return {
    type: 'memory',
    config: { maxSize, maxEntries },

    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;

      if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
        totalSize -= entry.size;
        entries.delete(key);
        return undefined;
      }

      // Refresh access order (LRU)
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },

    set(key: string, value: T, ttl?: number): void {
      const existing = entries.get(key);
      if (existing) {
        totalSize -= existing.size;
        entries.delete(key);
      }

      const size = estimateSize(key, value);
      evictByEntries();
      evictBySize(size);

      entries.set(key, {
        value,
        expiresAt: ttl !== undefined ? Date.now() + ttl : 0,
        size,
      });
      totalSize += size;
    },

    delete(key: string): void {
      const entry = entries.get(key);
      if (entry) {
        totalSize -= entry.size;
        entries.delete(key);
      }
    },

    destroy(): void {
      entries.clear();
      totalSize = 0;
    },
  };
}

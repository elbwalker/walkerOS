export interface CacheEntry {
  body: unknown;
  [key: string]: unknown;
}

interface StoreEntry {
  value: CacheEntry;
  expiresAt: number;
  size: number;
}

export interface MemoryStore {
  get(key: string): CacheEntry | undefined;
  set(key: string, value: CacheEntry, ttl: number): void;
  size(): number;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

function estimateSize(value: CacheEntry): number {
  const body = value.body;
  if (typeof body === 'string') return body.length * 2; // UTF-16
  return JSON.stringify(body).length * 2;
}

export function createMemoryStore(maxSize = DEFAULT_MAX_SIZE): MemoryStore {
  const entries = new Map<string, StoreEntry>();
  let totalSize = 0;

  function evict(needed: number) {
    for (const [key, entry] of entries) {
      if (totalSize + needed <= maxSize) break;
      totalSize -= entry.size;
      entries.delete(key);
    }
  }

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;

      if (Date.now() > entry.expiresAt) {
        totalSize -= entry.size;
        entries.delete(key);
        return undefined;
      }

      // Refresh access order (LRU)
      entries.delete(key);
      entries.set(key, entry);

      return entry.value;
    },

    set(key, value, ttl) {
      // Remove old entry if exists
      const existing = entries.get(key);
      if (existing) {
        totalSize -= existing.size;
        entries.delete(key);
      }

      const size = estimateSize(value);
      evict(size);

      entries.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
        size,
      });
      totalSize += size;
    },

    size() {
      return totalSize;
    },
  };
}

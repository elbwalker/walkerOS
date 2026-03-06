# @walkeros/store-memory

In-process key-value store with LRU eviction, TTL expiration, and namespace
support.

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/stores/memory)
| [NPM](https://www.npmjs.com/package/@walkeros/store-memory) |
[Documentation](https://www.walkeros.io/docs/stores/memory)

## Quick start (bundled mode)

```json
{
  "version": 1,
  "flows": {
    "default": {
      "server": {},
      "stores": {
        "cache": {
          "package": "@walkeros/store-memory",
          "config": {
            "settings": {
              "maxSize": 10485760,
              "maxEntries": 1000
            }
          }
        }
      }
    }
  }
}
```

## Integrated mode

```typescript
import { startFlow } from '@walkeros/collector';
import { storeMemoryInit } from '@walkeros/store-memory';

await startFlow({
  stores: {
    cache: {
      code: storeMemoryInit,
      config: {
        settings: {
          maxSize: 10 * 1024 * 1024, // 10 MB (default)
          maxEntries: 1000,
        },
      },
    },
  },
});
```

## Features

- **LRU eviction**: Least-recently-used entries are evicted when `maxSize` or
  `maxEntries` is exceeded
- **TTL expiration**: Optional per-entry time-to-live in milliseconds
- **Namespace utility**: Scope keys with `withNamespace(store, 'prefix')`
- **Mock store**: `createMockStore()` for unit testing with operation tracking
- **Platform-agnostic**: Works in both browser and server flows

## Installation

```bash
npm install @walkeros/store-memory
```

## Configuration

| Setting      | Type     | Required | Default            | Description                 |
| ------------ | -------- | -------- | ------------------ | --------------------------- |
| `maxSize`    | `number` | No       | `10485760` (10 MB) | Maximum total size in bytes |
| `maxEntries` | `number` | No       | —                  | Maximum number of entries   |

## API

```typescript
const value = store.get('key'); // T | undefined
store.set('key', 'value'); // void
store.set('key', 'value', 5000); // void (TTL in ms)
store.delete('key'); // void
store.destroy(); // void (clears all)
```

## Programmatic usage

Use `createMemoryStore()` directly when you don't need the `Store.Init` wrapper:

```typescript
import { createMemoryStore, withNamespace } from '@walkeros/store-memory';

const store = createMemoryStore<string>({ maxSize: 1024 });
const sessions = withNamespace(store, 'session');

sessions.set('user', 'alice'); // stored as "session:user"
```

## Testing

```typescript
import { createMockStore } from '@walkeros/store-memory';

const store = createMockStore<string>();
store.set('key', 'value');
store.get('key');

console.log(store._sets); // [{ key: 'key', value: 'value', ttl: undefined }]
console.log(store._gets); // ['key']
console.log(store._deletes); // []
```

## Related

- [Documentation](https://www.walkeros.io/docs/stores/memory)
- [Stores overview](https://www.walkeros.io/docs/stores)

---
name: walkeros-understanding-stores
description:
  Use when working with walkerOS stores, understanding key-value storage in
  flows, or learning about store injection via env. Covers interface, lifecycle,
  $store: wiring, and available store packages.
---

# Understanding walkerOS Stores

## Overview

Stores provide key-value storage that other components (sources, transformers,
destinations) consume via environment injection. They are the 4th component type
in Flow.Setup alongside sources, transformers, and destinations.

**Core principle:** Stores are passive infrastructure. They don't process events
or participate in chains — they provide state that other components read and
write.

## Store interface

See [packages/core/src/types/store.ts](../../packages/core/src/types/store.ts)
for the canonical interface.

### Instance

| Property  | Type                         | Purpose                      | Required     |
| --------- | ---------------------------- | ---------------------------- | ------------ |
| `type`    | `string`                     | Store type identifier        | **Required** |
| `config`  | `Store.Config`               | Settings and env             | **Required** |
| `get`     | `(key) => T \| undefined`    | Read a value                 | **Required** |
| `set`     | `(key, value, ttl?) => void` | Write a value (optional TTL) | **Required** |
| `delete`  | `(key) => void`              | Remove a value               | **Required** |
| `destroy` | `DestroyFn`                  | Cleanup on shutdown          | Optional     |

All methods can be sync or async (return `Promise`).

### Init function (context pattern)

Stores use the same context-based init pattern as other components:

```typescript
import type { Store } from '@walkeros/core';

export const storeMyStore: Store.Init = (context) => {
  const { config, env, logger, id } = context;
  const settings = config.settings || {};

  return {
    type: 'my-store',
    config: context.config as Store.Config,
    get(key) {
      /* ... */
    },
    set(key, value, ttl) {
      /* ... */
    },
    delete(key) {
      /* ... */
    },
    destroy() {
      /* cleanup */
    },
  };
};
```

**Context contains:**

| Property    | Type                 | Purpose                   |
| ----------- | -------------------- | ------------------------- |
| `config`    | `Store.Config`       | Settings from flow config |
| `env`       | `Store.Env`          | Environment dependencies  |
| `logger`    | `Logger.Instance`    | Scoped logger             |
| `id`        | `string`             | Store identifier          |
| `collector` | `Collector.Instance` | Reference to collector    |

## Lifecycle

Stores have the simplest lifecycle of all component types:

```
Startup:  Stores → Destinations → Transformers → Sources
Shutdown: Sources → Destinations → Transformers → Stores
```

- **Init first:** Stores init before all other components so they're available
  when sources/transformers/destinations start
- **Destroy last:** Stores destroy after all other components so transformers
  can flush during their own destroy
- **No lazy init:** Unlike destinations, stores don't support `require` or
  deferred activation — they are always eager

## Wiring stores via `$store:`

### Bundled mode (flow.json)

Use `$store:storeId` in a component's `env` to inject a store instance:

```json
{
  "stores": {
    "cache": {
      "package": "@walkeros/store-memory",
      "config": { "settings": { "maxSize": 10485760 } }
    }
  },
  "transformers": {
    "cacheResponse": {
      "package": "@walkeros/server-transformer-cache",
      "env": { "store": "$store:cache" }
    }
  }
}
```

The bundler resolves `$store:cache` to a runtime reference. Invalid references
are caught at build time.

### Integrated mode (TypeScript)

Pass store instances directly — no `$store:` prefix needed:

```typescript
import { startFlow } from '@walkeros/collector';
import { storeMemoryInit } from '@walkeros/store-memory';

const { collector } = await startFlow({
  stores: {
    cache: {
      code: storeMemoryInit,
      config: { settings: { maxSize: 10 * 1024 * 1024 } },
    },
  },
  transformers: {
    cacheResponse: {
      code: transformerCache,
      env: { store: collector.stores.cache }, // Direct reference
    },
  },
});
```

Note: In integrated mode, you wire the store instance directly in `env` rather
than using the `$store:` string prefix (that's a bundler feature).

## Available stores

### `@walkeros/store-memory` (in-memory)

LRU cache with TTL support. Suitable for caching, session state, deduplication.

```typescript
import { storeMemoryInit } from '@walkeros/store-memory';
// Or for direct programmatic usage (no Flow.Setup context):
import { createMemoryStore } from '@walkeros/store-memory';
```

**Settings:**

| Setting      | Type     | Default | Purpose                    |
| ------------ | -------- | ------- | -------------------------- |
| `maxSize`    | `number` | 10 MB   | Maximum total size (bytes) |
| `maxEntries` | `number` | —       | Maximum number of entries  |

**Two entry points:**

- `storeMemoryInit` — `Store.Init` wrapper for Flow.Setup / `startFlow()`
- `createMemoryStore()` — Direct factory for programmatic usage without context

### `@walkeros/server-store-fs` (filesystem)

File-based store for serving static assets. Server-only.

```typescript
import { storeFs } from '@walkeros/server-store-fs';
```

## Stores vs direct construction

| Approach                        | When to use                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `stores` section in flow config | Shared store consumed by multiple components via `$store:`                     |
| Direct `createMemoryStore()`    | Single component, self-contained (e.g., cache transformer's internal fallback) |

If only one transformer uses the store internally and doesn't expose it, the
transformer can construct it directly. If multiple components need the same
store instance, declare it in `stores` and wire via `$store:`.

## Accessing stores at runtime

After `startFlow()`, stores are available on the collector instance:

```typescript
const { collector } = await startFlow({
  stores: { cache: { code: storeMemoryInit } },
});

// Read/write
collector.stores.cache.set('key', 'value', 60000); // 60s TTL
const value = collector.stores.cache.get('key');
collector.stores.cache.delete('key');
```

## Key differences from other components

| Aspect        | Sources/Transformers/Destinations | Stores                   |
| ------------- | --------------------------------- | ------------------------ |
| Event flow    | Participate in push chain         | No push, no chain        |
| `next/before` | Chain connection fields           | None (passive)           |
| Lifecycle     | Init after stores                 | Init first, destroy last |
| `require`     | Deferred activation supported     | Always eager             |
| Interface     | `push(event, context)`            | `get/set/delete(key)`    |

## Related skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) -
  Architecture and Flow.Config structure
- [walkeros-understanding-transformers](../walkeros-understanding-transformers/SKILL.md) -
  Transformer interface and env pattern
- [walkeros-using-cli](../walkeros-using-cli/SKILL.md) - Bundling flows with
  stores

**Source files:**

- [packages/core/src/types/store.ts](../../packages/core/src/types/store.ts) -
  Store types
- [packages/collector/src/store.ts](../../packages/collector/src/store.ts) -
  initStores implementation
- [packages/stores/memory/src/](../../packages/stores/memory/src/) - Memory
  store package

**Documentation:**

- [Website: Flow](../../website/docs/getting-started/flow.mdx) - Flow
  configuration with stores section

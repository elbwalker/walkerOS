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
in Flow.Config alongside sources, transformers, and destinations.

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
    "data": {
      "package": "@walkeros/store-memory",
      "config": { "settings": { "maxSize": 10485760 } }
    }
  },
  "transformers": {
    "fingerprint": {
      "package": "@walkeros/server-transformer-fingerprint",
      "env": { "store": "$store:data" }
    }
  }
}
```

The bundler resolves `$store:data` to a runtime reference. Invalid references
are caught at build time.

### Integrated mode (TypeScript)

Pass store instances directly — no `$store:` prefix needed:

```typescript
import { startFlow } from '@walkeros/collector';
import { storeMemoryInit } from '@walkeros/store-memory';
import { transformerFingerprint } from '@walkeros/server-transformer-fingerprint';

const { collector } = await startFlow({
  stores: {
    data: {
      code: storeMemoryInit,
      config: { settings: { maxSize: 10 * 1024 * 1024 } },
    },
  },
  transformers: {
    fingerprint: {
      code: transformerFingerprint,
      env: { store: collector.stores.data }, // Direct reference
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
// Or for direct programmatic usage (no Flow.Config context):
import { createMemoryStore } from '@walkeros/store-memory';
```

**Settings:**

| Setting      | Type     | Default | Purpose                    |
| ------------ | -------- | ------- | -------------------------- |
| `maxSize`    | `number` | 10 MB   | Maximum total size (bytes) |
| `maxEntries` | `number` | —       | Maximum number of entries  |

**Two entry points:**

- `storeMemoryInit` — `Store.Init` wrapper for Flow.Config / `startFlow()`
- `createMemoryStore()` — Direct factory for programmatic usage without context

### `@walkeros/server-store-fs` (filesystem)

File-based store for serving static assets. Server-only.

```typescript
import { storeFsInit } from '@walkeros/server-store-fs';
```

### `@walkeros/server-store-s3` (S3-compatible object storage)

S3-compatible store using `s3mini` (~20 KB, zero dependencies). Works with AWS
S3, Cloudflare R2, Scaleway, DigitalOcean Spaces, Backblaze B2, MinIO, and any
S3-compatible provider. Returns `Buffer` from `get()` for file transformer
compatibility. Server-only.

```typescript
import { storeS3Init } from '@walkeros/server-store-s3';
```

**Settings:**

| Setting           | Type     | Required | Default  | Purpose                    |
| ----------------- | -------- | -------- | -------- | -------------------------- |
| `bucket`          | `string` | Yes      | —        | S3 bucket name             |
| `endpoint`        | `string` | Yes      | —        | S3-compatible endpoint URL |
| `accessKeyId`     | `string` | Yes      | —        | S3 access key ID           |
| `secretAccessKey` | `string` | Yes      | —        | S3 secret access key       |
| `region`          | `string` | No       | `"auto"` | AWS region (SigV4 signing) |
| `prefix`          | `string` | No       | —        | Key prefix for scoping     |

**Primary use case:** Serving static files in managed deployments (Mode D) where
files live in a bucket rather than being baked into a Docker image.

### `@walkeros/server-store-gcs` (Google Cloud Storage)

Zero-dependency GCS store using raw `fetch` + GCS JSON API. Built-in auth: ADC
on Cloud Run / GKE, or explicit service account JWT. Server-only.

```typescript
import { storeGcsInit } from '@walkeros/server-store-gcs';
```

**Settings:**

| Setting       | Type               | Required | Default | Purpose                  |
| ------------- | ------------------ | -------- | ------- | ------------------------ |
| `bucket`      | `string`           | Yes      | —       | GCS bucket name          |
| `prefix`      | `string`           | No       | —       | Key prefix for scoping   |
| `credentials` | `string \| object` | No       | ADC     | SA JSON for non-GCP envs |

**Primary use case:** Serving static files on GCP infrastructure (Cloud Run,
GKE) where ADC provides seamless authentication.

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

## Hooks

Store operations (`get`, `set`, `delete`) are wrapped with `useHooks` during
initialization, enabling pre/post interception via the collector's hooks system.

**Available hook names:**

| Hook name     | Pre hook         | Post hook         |
| ------------- | ---------------- | ----------------- |
| `StoreGet`    | `preStoreGet`    | `postStoreGet`    |
| `StoreSet`    | `preStoreSet`    | `postStoreSet`    |
| `StoreDelete` | `preStoreDelete` | `postStoreDelete` |

Hooks fire on every store operation regardless of which component triggered it
(cache system, transformer via env, destination via env, direct access on
`collector.stores`).

```typescript
const { collector } = await startFlow({
  stores: { cache: { code: storeMemoryInit } },
});

// Intercept all store reads
collector.hooks.preStoreGet = ({ fn }, key) => {
  console.log('Reading key:', key);
  return fn(key);
};
```

## Key differences from other components

| Aspect        | Sources/Transformers/Destinations | Stores                   |
| ------------- | --------------------------------- | ------------------------ |
| Event flow    | Participate in push chain         | No push, no chain        |
| `next/before` | Chain connection fields           | None (passive)           |
| Lifecycle     | Init after stores                 | Init first, destroy last |
| `require`     | Deferred activation supported     | Always eager             |
| Interface     | `push(event, context)`            | `get/set/delete(key)`    |

## Dev exports (`dev.ts`)

Every store package must export schemas and examples via `dev.ts`, matching the
convention used by sources and destinations:

### Required files

```
src/
├── schemas/
│   ├── settings.ts   # Zod schema for store settings
│   └── index.ts      # Re-export + zodToSchema() conversion
├── examples/
│   └── index.ts      # Example Store.Config objects
└── dev.ts            # export * as schemas; export * as examples
```

### Schema pattern

```typescript
// src/schemas/settings.ts
import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  mySetting: z.string().describe('Setting description for docs and MCP'),
});

export type Settings = z.infer<typeof SettingsSchema>;

// src/schemas/index.ts
import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
export { SettingsSchema, type Settings } from './settings';
export const settings = zodToSchema(SettingsSchema);
```

### tsup + package.json

```typescript
// tsup.config.ts
import { defineConfig, buildModules, buildDev } from '@walkeros/config/tsup';
export default defineConfig([buildModules(), buildDev()]);
```

Add `./dev` export to package.json:

```json
"./dev": {
  "types": "./dist/dev.d.ts",
  "import": "./dist/dev.mjs",
  "require": "./dist/dev.js"
}
```

### Why this matters

- `buildDev()` generates `dist/walkerOS.json` at build time
- MCP tools fetch `walkerOS.json` from CDN for package discovery and schema
  validation
- Website docs use `<PropertyTable schema={schemas.settings} />` instead of
  hardcoded markdown tables
- Without `dev.ts`, a store is invisible to MCP and docs tables rot

### Hints (Optional)

Stores can optionally export hints — lightweight, actionable context for AI
agents beyond what schemas and examples already provide. Create `src/hints.ts`:

```typescript
import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'persistence-behavior': {
    text: 'Describes persistence guarantees. See settings schema for options.',
  },
};
```

Export from `src/dev.ts` alongside schemas and examples:

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
export { hints } from './hints';
```

Most stores don't need hints — only add them for non-obvious behaviors,
prerequisites, or troubleshooting patterns.

## Related skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) -
  Architecture and Flow.Settings structure
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
- [packages/server/stores/fs/src/](../../packages/server/stores/fs/src/) -
  Filesystem store package
- [packages/server/stores/s3/src/](../../packages/server/stores/s3/src/) - S3
  store package
- [packages/server/stores/gcs/src/](../../packages/server/stores/gcs/src/) - GCS
  store package

**Documentation:**

- [Website: Flow](../../website/docs/getting-started/modes/bundled.mdx) - Flow
  configuration with stores section
- [Website: Stores](../../website/docs/stores/index.mdx) - Stores overview
- [Website: S3 Store](../../website/docs/stores/server/s3.mdx) - S3 store
  documentation
- [Website: FS Store](../../website/docs/stores/server/fs.mdx) - Filesystem
  store documentation
- [Website: Memory Store](../../website/docs/stores/memory.mdx) - Memory store
  documentation
- [Website: GCS Store](../../website/docs/stores/server/gcs.mdx) - GCS store
  documentation

---
name: walkeros-understanding-stores
description:
  Use when working with walkerOS stores, understanding key-value storage in
  flows, or learning about store injection via env. Covers interface, lifecycle,
  $store. wiring, and available store packages.
---

# Understanding walkerOS Stores

## Overview

Stores provide key-value storage that other components (sources, transformers,
destinations) consume via environment injection. They are the 4th component type
in Flow.Json alongside sources, transformers, and destinations.

**Core principle:** Stores are passive infrastructure. They don't process events
or participate in chains — they provide state that other components read and
write.

## Store interface

See [packages/core/src/types/store.ts](../../packages/core/src/types/store.ts)
for the canonical interface.

### Instance

| Property  | Type                               | Purpose                      | Required     |
| --------- | ---------------------------------- | ---------------------------- | ------------ |
| `type`    | `string`                           | Store type identifier        | **Required** |
| `config`  | `Store.Config`                     | Settings and env             | **Required** |
| `get`     | `(key) => StoreValue \| undefined` | Read a value                 | **Required** |
| `set`     | `(key, value, ttl?) => void`       | Write a value (optional TTL) | **Required** |
| `delete`  | `(key) => void`                    | Remove a value               | **Required** |
| `destroy` | `DestroyFn`                        | Cleanup on shutdown          | Optional     |

All methods can be sync or async (return `Promise`).

### Value type and `file` mode

Stores hold one canonical value type: structured data (`StoreValue`), with
binary (`Uint8Array`) as a first-class leaf. `StoreValue` is
`string | number | boolean | null | Uint8Array | StoreValue[] | { [key: string]: StoreValue }`
(`undefined` is reserved as the "miss" sentinel and is never a stored value). A
shared core codec (`serializeStoreValue` / `deserializeStoreValue`) round-trips
that value to and from each backing.

`Store.Config.file?: boolean` (default `false`) picks the mode, decided once at
init:

- **Structured (default):** values are `StoreValue` data, serialized by the
  shared codec.
- **File (`file: true`):** a byte-native backend (fs, S3, GCS) persists raw
  bytes byte-exact. `set()` accepts a `Uint8Array` or `string` and stores it
  untouched; `get()` hands the exact bytes back. Use for serving assets such as
  walker.js. The Sheets store is structured-only and rejects `file: true` at
  init.

TTL is owned by the cache layer, not the store. The store persists values; a
`cache` wrapper manages expiry. `flow_validate` warns when a store sets both
`file: true` and `cache`, and when a `@walkeros/server-transformer-file` is
wired to a byte-native store that does not set `file: true`.

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

## Wiring stores via `$store.`

### Bundled mode (flow.json)

Use `$store.storeId` in a component's `env` to inject a store instance:

```json
{
  "stores": {
    "data": {
      "package": "@walkeros/server-store-fs",
      "config": { "settings": { "basePath": "./data" } },
      "cache": { "rules": [{ "ttl": 60 }] }
    }
  },
  "transformers": {
    "fingerprint": {
      "package": "@walkeros/server-transformer-fingerprint",
      "env": { "store": "$store.data" }
    }
  }
}
```

The bundler resolves `$store.data` to a runtime reference. Invalid references
are caught at build time. `walkeros validate` also catches typos at validation
time, including unknown store names and the colon-instead-of-dot mistake (e.g.
`$store:data` is flagged with the suggested form `$store.data`).

The `cache` field enables the built-in in-memory cache tier (`__cache`) on top
of any backing store. No separate memory store declaration is needed.

### Integrated mode (TypeScript)

Pass store instances directly — no `$store.` prefix needed:

```typescript
import { startFlow } from '@walkeros/collector';
import { storeFsInit } from '@walkeros/server-store-fs';
import { transformerFingerprint } from '@walkeros/server-transformer-fingerprint';

const { collector } = await startFlow({
  stores: {
    data: {
      code: storeFsInit,
      config: { settings: { basePath: './data' } },
      cache: { rules: [{ ttl: 60 }] },
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
than using the `$store.` string prefix (that's a bundler feature).

## Available stores

### Built-in cache tier (`__cache`)

The collector ships a built-in in-memory cache with LRU eviction, TTL, and
entry/byte caps. Enable it on any store by setting `Flow.Store.cache`. No
separate package import needed:

```json
{
  "stores": {
    "files": {
      "package": "@walkeros/server-store-fs",
      "cache": { "rules": [{ "ttl": 60 }] }
    }
  }
}
```

Use this for the common "cache in front of a slow backing store" pattern (API,
GCS, Sheets, etc.).

### `@walkeros/server-store-fs` (filesystem)

File-based store for serving static assets. Server-only.

```typescript
import { storeFsInit } from '@walkeros/server-store-fs';
```

### `@walkeros/server-store-s3` (S3-compatible object storage)

S3-compatible store using `s3mini` (~20 KB, zero dependencies). Works with AWS
S3, Cloudflare R2, Scaleway, DigitalOcean Spaces, Backblaze B2, MinIO, and any
S3-compatible provider. Structured by default (stored as `application/json`);
set `file: true` to serve raw bytes byte-exact with the real mime. Server-only.

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

| Setting  | Type     | Required | Default | Purpose                |
| -------- | -------- | -------- | ------- | ---------------------- |
| `bucket` | `string` | Yes      | —       | GCS bucket name        |
| `prefix` | `string` | No       | —       | Key prefix for scoping |

Credentials live at `config.credentials` (sibling of `settings`):
`string | object` SA JSON for non-GCP envs, `$env`-resolvable; omit for ADC. The
deprecated `settings.credentials` still works.

**Primary use case:** Serving static files on GCP infrastructure (Cloud Run,
GKE) where ADC provides seamless authentication.

### `@walkeros/server-store-sheets` (Google Sheets)

Zero-dependency Google Sheets store using raw `fetch` + Sheets v4 REST API. One
row per key, one cell per value (JSON-serialized). Built-in auth shared with the
GCS store. Server-only. Structured-only: cells hold structured JSON, so it
rejects `file: true` at init and rejects values carrying a binary (`Uint8Array`)
leaf. Use fs, S3, or GCS for byte-exact serving.

```typescript
import { storeSheetsInit } from '@walkeros/server-store-sheets';
```

**Settings:**

| Setting      | Type     | Required | Default    | Purpose                          |
| ------------ | -------- | -------- | ---------- | -------------------------------- |
| `id`         | `string` | Yes      | —          | Spreadsheet ID (segment in URL)  |
| `sheet`      | `string` | No       | `'Sheet1'` | Sheet (tab) name                 |
| `key`        | `string` | No       | `'A'`      | Column letter for keys           |
| `value`      | `string` | No       | `'B'`      | Column letter for JSON values    |
| `headerRows` | `number` | No       | `1`        | Header rows to skip when reading |

Credentials live at `config.credentials` (sibling of `settings`):
`string | object` SA JSON for non-GCP envs, `$env`-resolvable; omit for ADC. The
deprecated `settings.credentials` still works.

**Primary use case:** Demos and small prototypes where the spreadsheet is the
operator-facing UI for tweaking lookup data. Quota: 60 reads/min and 60
writes/min per project. Enable the built-in cache via `Flow.Store.cache` on the
store declaration to absorb the quota, otherwise quota burns in seconds. **Not a
production CRM substitute.** See
[Website: Sheets Store](../../website/docs/stores/server/sheets.mdx) for the
cache-wiring example.

## Stores in flow config

Declare any store consumed by one or more components in the `stores` section of
the flow config and wire it via `$store.<id>` in component `env`. The built-in
cache tier (`Flow.Store.cache`) covers the "fast in-memory cache in front of a
slow backing store" pattern without a separate memory store.

## Accessing stores at runtime

After `startFlow()`, stores are available on the collector instance:

```typescript
const { collector } = await startFlow({
  stores: {
    files: { code: storeFsInit, config: { settings: { basePath: './data' } } },
  },
});

// Read/write
await collector.stores.files.set('key', 'value', 60000); // 60s TTL
const value = await collector.stores.files.get('key');
await collector.stores.files.delete('key');
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
  stores: {
    files: { code: storeFsInit, config: { settings: { basePath: './data' } } },
  },
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

## Setup (optional)

Stores can implement an optional `setup()` lifecycle to provision external
resources, for example creating a SQLite table, initializing an S3 bucket, or
running a one-off schema migration. Setup is **never** invoked by the runtime,
push, init, or deploy. It runs only when an operator explicitly types
`walkeros setup store.<name>`.

The signature is
`(ctx: LifecycleContext<Config<T>, Env<T>>) => Promise<unknown>`, where
`LifecycleContext` carries `{ id, config, env, logger }`. Idempotency is the
package's responsibility: the framework adds no opinion. Use
`resolveSetup(ctx.config.setup, DEFAULTS)` from `@walkeros/core` to normalize
the `boolean | object` shape into a concrete options object.

See [walkeros-create-destination](../walkeros-create-destination/SKILL.md),
[walkeros-create-source](../walkeros-create-source/SKILL.md),
[walkeros-understanding-destinations](../walkeros-understanding-destinations/SKILL.md),
[walkeros-understanding-sources](../walkeros-understanding-sources/SKILL.md),
and the `walkeros setup` CLI documentation for the authoring template and
operator workflow.

## Related Skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) -
  Architecture and Flow structure
- [walkeros-understanding-transformers](../walkeros-understanding-transformers/SKILL.md) -
  Transformer interface and env pattern
- [walkeros-using-store-cache](../walkeros-using-store-cache/SKILL.md) -
  Store-level cache and the declarative `state` block for fetch/stash without
  `$code:`
- [walkeros-using-cli](../walkeros-using-cli/SKILL.md) - Bundling flows with
  stores

**Source files:**

- [packages/core/src/types/store.ts](../../packages/core/src/types/store.ts) -
  Store types
- [packages/collector/src/store.ts](../../packages/collector/src/store.ts) -
  initStores implementation
- [packages/server/stores/fs/src/](../../packages/server/stores/fs/src/) -
  Filesystem store package
- [packages/server/stores/s3/src/](../../packages/server/stores/s3/src/) - S3
  store package
- [packages/server/stores/gcs/src/](../../packages/server/stores/gcs/src/) - GCS
  store package
- [packages/server/stores/sheets/src/](../../packages/server/stores/sheets/src/) -
  Google Sheets store package

**Documentation:**

- [Website: Flow](../../website/docs/getting-started/modes/bundled.mdx) - Flow
  configuration with stores section
- [Website: Stores](../../website/docs/stores/index.mdx) - Stores overview
- [Website: S3 Store](../../website/docs/stores/server/s3.mdx) - S3 store
  documentation
- [Website: FS Store](../../website/docs/stores/server/fs.mdx) - Filesystem
  store documentation
- [Website: GCS Store](../../website/docs/stores/server/gcs.mdx) - GCS store
  documentation
- [Website: Sheets Store](../../website/docs/stores/server/sheets.mdx) - Google
  Sheets store documentation

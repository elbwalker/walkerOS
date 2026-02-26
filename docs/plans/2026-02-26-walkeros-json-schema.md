# Plan: Add walkerOS.json to Demo Packages

**Date:** 2026-02-26 **Status:** Not started **Scope:**
`@walkeros/destination-demo` and `@walkeros/source-demo`

## Problem

The MCP `package_get` tool fetches `dist/walkerOS.json` from npm packages via
jsdelivr CDN (`cdn.jsdelivr.net/npm/<pkg>@<ver>/dist/walkerOS.json`). Currently
`@walkeros/destination-demo@2.0.0` and `@walkeros/source-demo@2.0.0` do NOT ship
this file, so `package_get` returns a 404 error. MCP tools cannot discover what
settings or mapping these packages support.

## Background: The walkerOS.json Convention

The convention is already well-established across 20+ packages. The pipeline:

1. Package defines Zod schemas in `src/schemas/` (settings, mapping, etc.)
2. `src/dev.ts` re-exports `schemas` and `examples` namespaces
3. `buildDev()` from `@walkeros/config/tsup` builds `src/dev.ts`, then in its
   `onSuccess` hook:
   - Imports the built `dist/dev.mjs` module
   - Extracts `schemas` (Zod instances are filtered out; plain JSON Schema
     objects pass through)
   - Extracts `examples` (functions serialized to `{ $code: fn.toString() }`)
   - Reads `$meta` from `package.json`'s `walkerOS` field (`type`, `platform`)
   - Writes `dist/walkerOS.json`
4. The `files: ["dist/**"]` field in `package.json` ensures it ships to npm

### walkerOS.json Structure

```json
{
  "$meta": {
    "package": "@walkeros/web-destination-plausible",
    "version": "2.0.1",
    "type": "destination",
    "platform": "web"
  },
  "schemas": {
    "settings": {
      /* JSON Schema Draft 7 */
    },
    "mapping": {
      /* JSON Schema Draft 7 */
    }
  },
  "examples": {
    /* serialized examples */
  }
}
```

- `$meta.type`: "destination" | "source" | "transformer"
- `$meta.platform`: "web" | "server" (omitted if platform-agnostic, e.g.
  transformers)
- `schemas`: Keys are schema names (typically `settings` and `mapping` for
  destinations/sources). Values are JSON Schema Draft 7 objects produced by
  `zodToSchema()`.
- `examples`: Serialized example configurations. Functions become
  `{ $code: "..." }`, Zod instances are filtered out.

### How MCP Consumes It

`@walkeros/core` exports `fetchPackageSchema()` (in `src/cdn.ts`) which:

1. Fetches `package.json` from jsdelivr for version info
2. Fetches `dist/walkerOS.json` from jsdelivr
3. Returns `{ packageName, version, type, platform, schemas, examples }`

The MCP `package_get` tool calls this function and returns the result.

## Current State of Demo Packages

Both packages live in `apps/demos/` (not `packages/`):

| Package                      | Location                  | Settings Interface                                     | Mapping Interface |
| ---------------------------- | ------------------------- | ------------------------------------------------------ | ----------------- |
| `@walkeros/destination-demo` | `apps/demos/destination/` | `{ name?: string; values?: string[] }`                 | `{}` (empty)      |
| `@walkeros/source-demo`      | `apps/demos/source/`      | `{ events: Array<PartialEvent & { delay?: number }> }` | `{}` (empty)      |

### What They Have

- `src/types.ts` with TypeScript `Settings` and `Mapping` interfaces
- `src/examples/env.ts` with env examples
- `src/examples/index.ts` that re-exports env
- `tsup.config.ts` with only `buildModules()` (no `buildDev()`)
- `package.json` with `files: ["dist/**"]` but no `walkerOS` field
- No `src/schemas/` directory
- No `src/dev.ts` file

### What They Need

- `src/schemas/settings.ts` — Zod schema matching the TS `Settings` interface
- `src/schemas/mapping.ts` — Zod schema matching the TS `Mapping` interface
- `src/schemas/index.ts` — exports + `zodToSchema()` calls
- `src/dev.ts` — re-exports `schemas` and `examples`
- `tsup.config.ts` — add `buildDev()` to the config array
- `package.json` — add `walkerOS` field and `./dev` export

## Implementation

### Step 1: Destination Demo — Create Schemas

**File: `apps/demos/destination/src/schemas/settings.ts`**

```typescript
import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  name: z
    .string()
    .optional()
    .describe('Display name used in log output prefix'),
  values: z
    .array(z.string())
    .optional()
    .describe(
      'Dot-notation paths to extract from event (e.g. "data.title"). If omitted, logs full event',
    ),
});

export type Settings = z.infer<typeof SettingsSchema>;
```

**File: `apps/demos/destination/src/schemas/mapping.ts`**

```typescript
import { z } from '@walkeros/core/dev';

/**
 * Demo destination has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
```

**File: `apps/demos/destination/src/schemas/index.ts`**

```typescript
import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

export { SettingsSchema, type Settings } from './settings';
export { MappingSchema, type Mapping } from './mapping';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
```

### Step 2: Destination Demo — Create dev.ts

**File: `apps/demos/destination/src/dev.ts`**

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Step 3: Destination Demo — Update tsup.config.ts

**File: `apps/demos/destination/tsup.config.ts`**

```typescript
import { defineConfig, buildModules, buildDev } from '@walkeros/config/tsup';

export default defineConfig([buildModules(), buildDev()]);
```

### Step 4: Destination Demo — Update package.json

Add `walkerOS` field, `./dev` export, and `@walkeros/core` dev export path:

```json
{
  "walkerOS": {
    "type": "destination"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./dev": {
      "types": "./dist/dev.d.ts",
      "import": "./dist/dev.mjs",
      "require": "./dist/dev.js"
    }
  }
}
```

Note: No `platform` field because the demo destination is platform-agnostic
(works on both web and server).

### Step 5: Source Demo — Create Schemas

**File: `apps/demos/source/src/schemas/settings.ts`**

```typescript
import { z } from '@walkeros/core/dev';
import { DeepPartialEventSchema } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  events: z
    .array(
      DeepPartialEventSchema.extend({
        delay: z
          .number()
          .optional()
          .describe('Milliseconds to wait before pushing this event'),
      }),
    )
    .describe('Events to push to the collector on init'),
});

export type Settings = z.infer<typeof SettingsSchema>;
```

Note: The source Settings requires `events` (not optional). The
`DeepPartialEventSchema` from core may or may not fit perfectly. If it causes
issues, fall back to `z.record(z.string(), z.unknown())` with a `.passthrough()`
for the event shape, and extend with `delay`. The key goal is to produce a
useful JSON Schema, not to enforce strict runtime validation.

**Fallback approach if DeepPartialEventSchema import is problematic:**

```typescript
import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  events: z
    .array(
      z
        .object({
          delay: z
            .number()
            .optional()
            .describe('Milliseconds to wait before pushing this event'),
        })
        .passthrough()
        .describe('Partial walkerOS event with optional delay'),
    )
    .describe('Events to push to the collector on init'),
});

export type Settings = z.infer<typeof SettingsSchema>;
```

**File: `apps/demos/source/src/schemas/mapping.ts`**

```typescript
import { z } from '@walkeros/core/dev';

/**
 * Demo source has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
```

**File: `apps/demos/source/src/schemas/index.ts`**

```typescript
import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

export { SettingsSchema, type Settings } from './settings';
export { MappingSchema, type Mapping } from './mapping';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
```

### Step 6: Source Demo — Create dev.ts

**File: `apps/demos/source/src/dev.ts`**

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Step 7: Source Demo — Update tsup.config.ts

**File: `apps/demos/source/tsup.config.ts`**

```typescript
import { defineConfig, buildModules, buildDev } from '@walkeros/config/tsup';

export default defineConfig([buildModules(), buildDev()]);
```

### Step 8: Source Demo — Update package.json

Add `walkerOS` field and `./dev` export:

```json
{
  "walkerOS": {
    "type": "source"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./dev": {
      "types": "./dist/dev.d.ts",
      "import": "./dist/dev.mjs",
      "require": "./dist/dev.js"
    }
  }
}
```

### Step 9: Build and Validate

```bash
cd /workspaces/developer/walkerOS

# Build destination demo
cd apps/demos/destination && npm run build

# Verify walkerOS.json was generated
cat dist/walkerOS.json | jq .

# Build source demo
cd ../source && npm run build

# Verify walkerOS.json was generated
cat dist/walkerOS.json | jq .
```

Expected output for destination demo:

```json
{
  "$meta": {
    "package": "@walkeros/destination-demo",
    "version": "2.0.0",
    "type": "destination"
  },
  "schemas": {
    "settings": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Display name used in log output prefix"
        },
        "values": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Dot-notation paths to extract from event ..."
        }
      },
      "additionalProperties": false
    },
    "mapping": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  },
  "examples": {
    "env": { ... }
  }
}
```

### Step 10: Run Tests

```bash
cd /workspaces/developer/walkerOS

# Run demo tests to make sure nothing broke
cd apps/demos/destination && npm test
cd ../source && npm test
```

### Step 11: Validate with MCP Tool (Post-Publish)

After the next npm publish, verify:

```
package_get @walkeros/destination-demo
package_get @walkeros/source-demo
```

Both should return schemas and examples instead of 404 errors.

## Files Changed Summary

### Destination Demo (`apps/demos/destination/`)

| File                      | Action | Description                              |
| ------------------------- | ------ | ---------------------------------------- |
| `src/schemas/settings.ts` | Create | Zod schema for Settings interface        |
| `src/schemas/mapping.ts`  | Create | Zod schema for Mapping interface (empty) |
| `src/schemas/index.ts`    | Create | Schema exports + zodToSchema conversion  |
| `src/dev.ts`              | Create | Dev entry exporting schemas and examples |
| `tsup.config.ts`          | Edit   | Add `buildDev()` to config array         |
| `package.json`            | Edit   | Add `walkerOS` field, `./dev` export     |

### Source Demo (`apps/demos/source/`)

| File                      | Action | Description                              |
| ------------------------- | ------ | ---------------------------------------- |
| `src/schemas/settings.ts` | Create | Zod schema for Settings interface        |
| `src/schemas/mapping.ts`  | Create | Zod schema for Mapping interface (empty) |
| `src/schemas/index.ts`    | Create | Schema exports + zodToSchema conversion  |
| `src/dev.ts`              | Create | Dev entry exporting schemas and examples |
| `tsup.config.ts`          | Edit   | Add `buildDev()` to config array         |
| `package.json`            | Edit   | Add `walkerOS` field, `./dev` export     |

## Adoption Guide for Other Packages

Any walkerOS package can adopt this convention by following the same pattern:

1. Create `src/schemas/` with Zod schemas matching TS interfaces
2. Use `zodToSchema()` from `@walkeros/core/dev` to produce JSON Schema
3. Create `src/dev.ts` exporting `schemas` and `examples`
4. Add `buildDev()` to `tsup.config.ts`
5. Add `walkerOS: { type, platform }` to `package.json`
6. Add `./dev` export to `package.json` `exports` field
7. Build and verify `dist/walkerOS.json` is generated

The `files: ["dist/**"]` field (already present in all packages) ensures
`walkerOS.json` ships to npm automatically.

## Risks and Edge Cases

- **`@walkeros/core/dev` dependency**: The demo packages depend on
  `@walkeros/core` but the `dev` subpath (which provides `z` and `zodToSchema`)
  is only needed at build time. Since `buildDev()` dynamically imports the built
  `dev.mjs`, and the schemas are compiled away into JSON at build time, this
  works without adding `zod` as a direct dependency.

- **Source Settings complexity**: The source demo's `Settings.events` contains
  `WalkerOS.PartialEvent & { delay?: number }`. Using the exact
  `DeepPartialEventSchema` from core may produce a very large JSON Schema. If
  this is a problem, use the simpler fallback (passthrough object with `delay`).
  The schema is for MCP discovery, not strict validation.

- **Version bump**: The `walkerOS.json` will include the version from
  `package.json`. Remember to bump versions before publishing to npm.

## Open Questions

1. Should the destination demo include a `platform` in `$meta`? Currently the
   demo packages import from `@walkeros/core` (not `@walkeros/web-core`), making
   them platform-agnostic. Omitting platform seems correct.

2. Should we also add `walkerOS.json` to `@walkeros/transformer-demo`? That
   package also lacks it (same `apps/demos/transformer/` pattern with only
   `buildModules()`). It would be a natural follow-up.

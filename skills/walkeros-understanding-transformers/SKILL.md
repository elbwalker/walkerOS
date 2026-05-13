---
name: walkeros-understanding-transformers
description:
  Use when working with walkerOS transformers, understanding event
  validation/enrichment/redaction, or learning about transformer chaining.
  Covers interface, return values, and pipeline integration.
---

# Understanding walkerOS Transformers

## Overview

Transformers are middleware for **validating**, **enriching**, and **redacting**
events in the walkerOS pipeline. They run in chains at configurable points
between sources, collector, and destinations.

**Core principle:** Transformers transform events. They don't capture (sources)
or deliver (destinations)—they modify events in-flight.

## Use Cases

| Use Case     | Purpose                                   | Example                  |
| ------------ | ----------------------------------------- | ------------------------ |
| **Validate** | Ensure events match schema contracts      | JSON Schema validation   |
| **Enrich**   | Add server-side data to events            | User segments, geo data  |
| **Redact**   | Remove sensitive data before destinations | Strip PII, anonymize IPs |

## Transformer Interface

See
[packages/core/src/types/transformer.ts](../../packages/core/src/types/transformer.ts)
for canonical interface.

### Init Function (Context Pattern)

Transformers use a context-based initialization pattern:

```typescript
import type { Transformer } from '@walkeros/core';

export const transformerMyTransformer: Transformer.Init<Types> = (context) => {
  const { config = {}, env, logger, id } = context;
  // Apply defaults inline — flow.json is developer-controlled, so no
  // runtime validation. Shape checks live in ./schemas and are used by
  // `walkeros validate` and dev tooling, never at runtime.
  const userSettings = config.settings || {};
  const settings = {
    ...userSettings,
    // example default: threshold: userSettings.threshold ?? 100,
  };

  return {
    push(event, pushContext) {
      // Process event
      return { event };
    },
  };
};
```

**Init Context contains:**

| Property    | Type                 | Purpose                                 |
| ----------- | -------------------- | --------------------------------------- |
| `config`    | `Transformer.Config` | Settings, mapping, next chain           |
| `env`       | `Types['env']`       | Environment deps (stores via `$store.`) |
| `logger`    | `Logger`             | Logging functions                       |
| `id`        | `string`             | Transformer identifier                  |
| `collector` | `Collector.Instance` | Reference to collector                  |
| `ingest`    | `Ingest` (optional)  | Request metadata from source            |

### Instance Methods

| Method    | Purpose                              | Required     |
| --------- | ------------------------------------ | ------------ |
| `push`    | Process event, return modified/false | **Required** |
| `init`    | One-time initialization              | Optional     |
| `destroy` | Cleanup resources                    | Optional     |

## Return Values

The `push` function controls event flow:

| Return               | Behavior                                            |
| -------------------- | --------------------------------------------------- |
| `{ event }`          | Continue chain with modified event                  |
| `void`               | Continue chain, event unchanged                     |
| `false`              | Stop chain, event dropped                           |
| `{ event, next }`    | Redirect chain to a different transformer (fan-out) |
| `{ event, respond }` | Continue chain with wrapped respond function        |

```typescript
push(event, context) {
  if (!event.data?.id) {
    context.logger.error('Missing required id');
    return false;  // Stop chain
  }

  event.data.enrichedAt = Date.now();
  return { event };  // Continue with modified event
}
```

## Inline Code Transformers

For simple transformations without external packages, use inline code with the
`$code:` string prefix in JSON configs. The `$code:` prefix tells the CLI
bundler to parse the following string as executable JavaScript:

```json
{
  "transformers": {
    "enrich": {
      "code": {
        "push": "$code:(event) => { event.data.enrichedAt = Date.now(); return { event }; }"
      },
      "next": "validate"
    }
  }
}
```

**Inline code structure:**

| Property    | Purpose                             |
| ----------- | ----------------------------------- |
| `code.init` | Code run once during initialization |
| `code.push` | Code run for each event             |

**Push code has access to:**

- `event` - The event being processed
- `context` - Push context with logger, config, etc.

**Return values in push code:**

- Return `{ event }` to continue chain with modified event
- Return `undefined` to pass event unchanged
- Return `false` to drop event from chain

**Example: Filtering internal events**

```json
{
  "transformers": {
    "filter": {
      "code": {
        "push": "$code:(event) => { if (event.name.startsWith('internal_')) return false; return { event }; }"
      }
    }
  }
}
```

**Mixing inline and package transformers:**

```json
{
  "transformers": {
    "addTimestamp": {
      "code": {
        "push": "$code:(event) => { event.data.processedAt = new Date().toISOString(); return { event }; }"
      },
      "next": "enrich"
    },
    "enrich": {
      "package": "@walkeros/transformer-enricher"
    }
  }
}
```

## Pipeline Integration

Transformers run at two points in the pipeline:

```
Source → [Pre-Transformers] → Collector → [Post-Transformers] → Destination
          (source.next)                   (destination.before)
```

### Pre-Collector Chain

Runs after source captures event, before collector enrichment:

```typescript
sources: {
  browser: {
    code: sourceBrowser,
    next: 'validate'  // First transformer in pre-chain
  }
}
```

### Post-Collector Chain

Runs after collector enrichment, before destination receives event:

```typescript
destinations: {
  gtag: {
    code: destinationGtag,
    before: 'redact'  // First transformer in post-chain
  }
}
```

### Chain Linking

Transformers link together via `next`:

```typescript
transformers: {
  fingerprint: {
    code: transformerFingerprint,
    config: { next: 'enrich' }  // Chain to next transformer
  },
  enrich: {
    code: transformerEnrich,
    config: { next: 'redact' }
  },
  redact: {
    code: transformerRedact
    // No next = end of chain
  }
}
```

### Branching and fan-out

Transformers can redirect events to different chains using the `branch()`
factory from `@walkeros/core`:

```typescript
import { branch } from '@walkeros/core';

push(event, context) {
  return branch(event, 'parser');         // Single target
  return branch(event, ['a', 'b']);       // Fan-out to multiple
}
```

Conditional routing is built into `next`/`before` properties using the `case`
operator — no separate router transformer needed:

```json
"next": {
  "case": [
    { "match": { "key": "ingest.path", "operator": "prefix", "value": "/api" }, "next": "api-handler" },
    { "next": "default" }
  ]
}
```

`case` entries are evaluated in order, first match wins. A `RouteConfig` is a
disjoint union: each config sets at most one of `next` or `case`, never both. An
entry with no `match` always matches (use it as a fallback). If no entry
matches, the event passes through unchanged.

### Paths and pass-through steps

walkerOS uses two vocabulary terms for chain composition:

- **Path:** the multi-step chain that an event walks through a flow's
  `transformers` section.
- **Pass-through step** (short: **pass**): a single step inside a path that
  declares no `code` and no `package`. The runtime synthesizes the push, so the
  step contributes structure without shipping executable code.

A pass-through step ships in three variants. Each variant uses a different
operative field; combine them on the same step when it helps.

#### Variant 1: chain-only (before / next)

A named hop that shares a chain across multiple call sites. Use it to avoid
duplicating arrays in `before` / `next` references:

```json
{
  "transformers": {
    "validateThenEnrich": {
      "before": ["validate", "enrich"]
    }
  },
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "before": "validateThenEnrich"
    },
    "meta": {
      "package": "@walkeros/web-destination-meta",
      "before": "validateThenEnrich"
    }
  }
}
```

#### Variant 2: cache-only

A step that declares only a `cache` block. Useful for deduplication or
short-circuit halts. `cache.stop: true` at a pre-collector position halts the
pipeline (not just the local chain):

```json
{
  "transformers": {
    "dedup": {
      "cache": {
        "stop": true,
        "rules": [{ "key": ["event.id"], "ttl": 60 }]
      }
    }
  }
}
```

#### Variant 3: mapping-only

A step that declares only a `mapping: Mapping.Config`. The runtime synthesizes a
push that calls `processEventMapping` and mutates the event in-flight:

```json
{
  "transformers": {
    "redactPII": {
      "mapping": {
        "policy": {
          "user.email": { "value": "[redacted]" }
        }
      }
    }
  }
}
```

See [walkeros-understanding-mapping](../walkeros-understanding-mapping/SKILL.md)
for the mapping primitives (`policy`, `data`, `mapping[].name`, etc.) and the
"Mapping at the transformer position" section for the dual semantic.

### Mapping at transformer position vs destination position

`mapping` is the same field shape (`Mapping.Config`) in both positions, but the
semantic is disambiguated by where the step sits:

| Position    | What `mapping` produces                                   |
| ----------- | --------------------------------------------------------- |
| Destination | A vendor-shaped payload (the destination consumes `data`) |
| Transformer | A mutated event that continues through the chain          |

At the transformer position, only event-mutating fields apply: `policy`,
`mapping[].policy`, `mapping[].name`, `mapping[].ignore`, `mapping[].consent`,
and `include`. Vendor-payload fields (`data`, `mapping[].data`, `silent`) are
ignored with a one-time init warning. `mapping[].ignore: true` drops the event
from the chain (not "skip this destination", which is the destination-position
semantic).

### Closed schema (unknown keys are errors)

Transformer step entries follow a **closed schema**. Known keys only: `code`,
`package`, `config`, `before`, `next`, `cache`, `mapping`. Unknown keys at the
top of a step are validation errors. This catches misrouted keys (e.g.
`{ rules: [], stop: true }` placed at the top of a step instead of nested under
`cache:`) at validate time instead of letting them silently pass through at
runtime.

A step must declare at least one operative field. An empty `{}` is rejected with
`EMPTY_TRANSFORMER`. Declaring both `code` and `package` on the same step is
rejected with `CONFLICT`.

### Chain resolution safety

`walkChain()` uses a visited set to detect circular references. If a cycle is
found, the loop is silently broken and the chain ends. If `next` points to a
non-existent transformer, the chain also ends without error.

### Composition principle

A transformer owns its own chain. When a chain references a transformer by name,
that transformer's own `before` chain runs before its push, and its `next` chain
after, both are walked recursively, with cycle detection. Cache halt signals
(`cache.stop: true`) at pre-collector positions propagate pipeline-wide;
destinations do not see the dropped event. The grammar's recursive `Route` shape
(`string | Route[] | RouteConfig`) compiles element-by-element, so sequences can
mix transformer IDs and inline `case` / `next` routes
(`next: ["dedup", { case: [...] }]` is valid). This is the model to default to
when adding new chain primitives.

See [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) for
the full connection rules between sources, transformers, and destinations.

## Push Context

The `push` function receives a context with event metadata:

| Property    | Purpose                      |
| ----------- | ---------------------------- |
| `config`    | Transformer configuration    |
| `env`       | Environment dependencies     |
| `logger`    | Scoped logger for output     |
| `id`        | Transformer identifier       |
| `collector` | Access to collector instance |
| `ingest`    | Request metadata from source |

```typescript
push(event, context) {
  const { logger, id, ingest } = context;

  logger.debug('Processing', { transformer: id, event: event.name });

  // Access request metadata if available
  if (ingest?.ip) {
    event.data = { ...event.data, clientIp: ingest.ip };
  }

  return { event };
}
```

## Response Delegation (env.respond)

Transformers can customize HTTP responses by calling
`context.env.respond?.({ body, status?, headers? })`. This is useful for
validation transformers that reject events with custom error responses, or
transformers that short-circuit the pipeline. First call wins (idempotent). The
respond function is optional — only present when the source provides one.

## Transformer Paths

| Path                     | Description          |
| ------------------------ | -------------------- |
| `packages/transformers/` | Transformer packages |

## Related Skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) - How
  transformers fit in architecture
- [walkeros-create-transformer](../walkeros-create-transformer/SKILL.md) -
  Create new transformer

**Source Files:**

- [packages/core/src/types/transformer.ts](../../packages/core/src/types/transformer.ts) -
  Interface

**Documentation:**

- [Website: Transformers](../../website/docs/transformers/index.mdx) - Overview
- [Website: Create Your Own](../../website/docs/transformers/create-your-own.mdx) -
  Guide

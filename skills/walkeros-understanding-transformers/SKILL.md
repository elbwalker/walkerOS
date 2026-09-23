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

## Available Packages

| Package                                    | Env    | Purpose                                            |
| ------------------------------------------ | ------ | -------------------------------------------------- |
| `@walkeros/transformer-validate`           | both   | Enforce JSON Schema contracts on events at runtime |
| `@walkeros/transformer-ga4`                | server | Decode GA4 Measurement Protocol hits into events   |
| `@walkeros/server-transformer-bot`         | server | Annotate an automation score and client category   |
| `@walkeros/server-transformer-fingerprint` | server | Derive a stable visitor fingerprint                |

### Contract validation

`@walkeros/transformer-validate` is the runtime arm of a
[contract](../../website/docs/getting-started/flow/contract.mdx). Event shapes
live in the top-level `contract` block; the transformer references one via
`$contract.<name>` in its `contract` setting and validates the canonical event.
`mode: "strict"` drops invalid events (chain-stop); `mode: "pass"` (default)
annotates `event.source.valid` and continues so a downstream step can route on
the verdict. `format: true` additionally checks the canonical `WalkerOS.Event`
structure. Filtering is the same mechanism: an inline schema that rejects the
unwanted events plus `mode: "strict"`, there is no separate `ignore` field. See
[Website: Validate transformer](../../website/docs/transformers/validate.mdx).

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

| Return               | Behavior                                                              |
| -------------------- | --------------------------------------------------------------------- |
| `{ event }`          | Continue chain with modified event                                    |
| `void`               | Continue chain, event unchanged                                       |
| `false`              | Stop chain, event dropped                                             |
| `{ event, next }`    | Route via `next` in place of its own `next`, then the chain continues |
| `{ event, respond }` | Continue chain with wrapped respond function                          |
| `Result[]`           | Fork: each result is its own copy with a derived `event.id`           |

A `push` that throws also stops the chain and drops the event; the collector
logs it and counts it in `status.failed`. Catch a library error inside `push`
when the event should continue.

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

Transformers run at three points around the collector:

```
Source → [Source chain] → Collector → [Collector chain] → fan-out → [Destination chain] → Destination
          (source.next)                (collector.next)              (destination.before)
```

### Source Chain

Runs after source captures event, before collector enrichment:

```typescript
sources: {
  browser: {
    code: sourceBrowser,
    next: 'validate'  // First transformer in the source chain
  }
}
```

### Collector Chain

Runs once per event after collector enrichment, before the destination fan-out.
Every destination receives its output; a `stop` here (or a transformer returning
`false`) drops the event for all destinations:

```typescript
startFlow({
  next: ['bot', 'validate'], // collector.next in flow.json
  // ...
});
```

### Destination Chain

Runs per destination, after the collector chain, before that destination
receives the event. Use it for per-destination work and filtering; a `stop` here
skips only this destination:

```typescript
destinations: {
  gtag: {
    code: destinationGtag,
    before: 'redact'  // First transformer in the destination chain
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
factory from `@walkeros/core`. The route replaces the transformer's own `next`
for this event; after it, the enclosing array continues:

```typescript
import { branch } from '@walkeros/core';

push(event, context) {
  return branch(event, 'parser');                  // Single target
  return branch(event, ['a', 'b']);                // Sequence: a, then b
  return branch(event, { many: ['a', 'b'] });      // Fork: two copies
  return branch(event, { stop: true });            // End this copy
}
```

Conditional routing is built into `next`/`before` properties using the `one`
operator, no separate router transformer needed:

```json
"next": {
  "one": [
    { "match": { "key": "ingest.path", "operator": "prefix", "value": "/api" }, "next": "api-handler" },
    { "next": "default" }
  ]
}
```

`one` entries are evaluated in order, first match wins. A `RouteConfig` is a
disjoint union: each config sets at most one of `next` (gated link), `one`
(first-match dispatch), `many` (all-match fan-out), or `stop` (drop), never more
than one. Every `match` reads `{ ingest, event }` and is evaluated when the
event reaches it, so it sees what earlier steps wrote. An entry with no `match`
always matches (use it as a fallback). If no entry matches, the event passes
through unchanged. Use `many` (allowed in every chain field) when every matching
branch should run: each matching entry becomes an independent copy of the event
with its own derived `event.id`, and each copy finishes the rest of the path on
its own (never merged):

```json
"next": {
  "many": [
    { "match": { "key": "event.consent.analytics", "operator": "eq", "value": "granted" }, "next": "ga4-pipeline" },
    { "next": "audit-log" }
  ]
}
```

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
short-circuit halts. `cache.stop: true` in a source chain or `collector.next`
halts the event for all destinations (not just the local chain); in a
`destination.before` chain it skips the rest of that chain and the destination
receives the cached event:

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

Every chain position runs through one runner (`runTransformerChain` in
`@walkeros/collector`) over the core continuation stack (`startChain` /
`advanceChain`). Routes resolve per hop via `getNextSteps(spec, root)`, which
needs the root `{ ingest, event }` and returns `NextSteps`: ids (plus a
continuation for the rest of a sequence), a stop, or forks. A member `next` that
leads back to a step already on its insertion path is skipped, and each copy is
capped at 256 steps. A step listed twice in an array runs twice. An unknown
transformer id is logged as a warning and skipped, and the chain continues;
`walkeros validate` reports it as an `UNKNOWN_ROUTE_TARGET` error. Static tools
without an event use `getRouteGraph(spec, transformers?)`, which enumerates
every branch of the same compiled route.

### Composition principle

A transformer owns its own chain. When a chain references a transformer by name,
that transformer's own `before` chain runs before its push, and its `next` chain
after, both recursively, with cycle detection. This holds inside an explicit
array too: the array is the backbone, and a member's own `next` is inserted
right after that member before the array continues (`["bot", "validate"]` with
`bot.next = "foo"` runs bot, foo, validate). Cache halt signals
(`cache.stop: true`) in a source chain or `collector.next` propagate to every
destination. The grammar's recursive `Route` shape
(`string | Route[] | RouteConfig`) compiles element-by-element, so sequences can
mix transformer IDs and inline `one` / `many` / `next` routes
(`next: ["dedup", { one: [...] }]` is valid). This is the model to default to
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
- [walkeros-using-store-cache](../walkeros-using-store-cache/SKILL.md) -
  Declarative `state` block for fetch/stash without `$code:`

**Source Files:**

- [packages/core/src/types/transformer.ts](../../packages/core/src/types/transformer.ts) -
  Interface

**Documentation:**

- [Website: Transformers](../../website/docs/transformers/index.mdx) - Overview
- [Website: Create Your Own](../../website/docs/transformers/create-your-own.mdx) -
  Guide

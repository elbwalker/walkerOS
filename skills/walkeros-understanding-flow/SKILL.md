---
name: walkeros-understanding-flow
description:
  Use when learning walkerOS architecture, understanding data flow, or designing
  composable event pipelines. Covers Source→Collector→Destination pattern and
  separation of concerns.
---

# Understanding walkerOS Flow

## Overview

walkerOS follows a **Source → Collector → Destination(s)** architecture for
composable, modular event processing.

**Core principle:** Separation of concerns. Each component has one job.
Components are composable and replaceable.

## The Flow Pattern

```
[Source.before] → Sources → [Source.next] → Collector → [Dest.before] → Destinations → [Dest.next]
(Preprocessing)  (Capture)  (Pre-chain)   (Processing) (Post-chain)   (Delivery)     (Post-push)

Consent-exempt:                                                                        Post-consent:
- Decode                    - Validation   - Event creation - Validation   - Push       - Audit logging
- Validate format           - Enrichment   - Enrichment    - Enrichment   - Send       - Response parsing
- Authenticate              - Redaction    - Consent check - Routing      - Store      - Webhooks
```

## Key Concepts

### Composability

A Flow combines components. You can:

- Use multiple sources feeding one collector
- Route events to multiple destinations
- Swap components without changing others

### The Flow Type

See [packages/core/src/types/flow.ts](../../packages/core/src/types/flow.ts) for
the canonical interface.

```typescript
// Conceptual structure (see source for full type)
interface Flow {
  stores?: Record<string, Store>;
  sources?: Record<string, Source>;
  transformers?: Record<string, Transformer>;
  destinations?: Record<string, Destination>;
  collector?: Collector.InitConfig;
}
```

### Universal Push Interface

**All components communicate via `push` functions:**

| Component   | Push Signature                | Purpose               |
| ----------- | ----------------------------- | --------------------- |
| Source      | `push(input) → events`        | Capture external data |
| Collector   | `push(event) → void`          | Process and route     |
| Destination | `push(event, context) → void` | Transform and deliver |

The `elb()` function is an alias for `collector.push` - used for component
wiring.

### startFlow Helper

See [packages/collector/src/flow.ts](../../packages/collector/src/flow.ts) for
the `startFlow` function.

```typescript
import { startFlow } from '@walkeros/collector';

const { collector, elb } = await startFlow({
  stores: {
    /* key-value storage, init first, destroy last */
  },
  sources: {
    /* ... */
  },
  transformers: {
    /* ... */
  },
  destinations: {
    /* ... */
  },
});
```

## Ingest: Mutable Pipeline Context

walkerOS uses a two-layer data model:

- **Event** - strict schema, structured analytics data (name, data, context,
  etc.)
- **Ingest** - free-form mutable context that flows alongside events

Any step can read and write arbitrary keys on ingest. The runtime manages
`_meta`:

- `_meta.hops` - increments per step (safety valve at 256)
- `_meta.path` - ordered list of step IDs visited (path[0] = source ID)

```typescript
// In a transformer
push: async (event, context) => {
  context.ingest.botScore = 0.95; // Write freely
  context.ingest.geo = { country: 'DE' };
  console.log(context.ingest._meta.path); // ['express', 'validate', 'enrich']
  return { event };
};
```

Ingest is cloned per destination to prevent cross-contamination in parallel
processing. After a destination push, the response is available at
`ingest._response`.

## Stores

Three pipeline components (Source / Transformer / Destination) plus Stores as
**passive infrastructure**. Stores are not a fourth pipeline stage - they're
key-value storage that other components consume via `env`. They have no `push`,
no `next`, no `before`; they sit alongside the pipeline rather than inside it.

- Referenced via `$store.storeId` in `env` values (bundled mode) or passed
  directly as store instances (integrated mode)
- **Init first, destroy last** - stores are available before any source,
  transformer, or destination starts, and outlive them on shutdown
- **No chains** - stores don't participate in the event pipeline. Components
  access them through their `env`.
- Implementations: `@walkeros/store-memory` (sync, LRU),
  `@walkeros/server-store-fs` (async, filesystem), `@walkeros/server-store-s3`
  (async, S3-compatible)

```json
{
  "stores": {
    "data": { "package": "@walkeros/store-memory" }
  },
  "transformers": {
    "fingerprint": {
      "package": "@walkeros/server-transformer-fingerprint",
      "env": { "store": "$store.data" }
    }
  }
}
```

See [walkeros-understanding-stores](../walkeros-understanding-stores/SKILL.md)
for the full store interface and lifecycle.

## Separation of Concerns

| Concern          | Handled By     | NOT Handled By          |
| ---------------- | -------------- | ----------------------- |
| Event capture    | Sources        | Collector, Destinations |
| Event structure  | Event model    | Components              |
| Consent checking | Collector      | Sources, Destinations   |
| Transformation   | Mapping system | Raw push calls          |
| Delivery         | Destinations   | Sources, Collector      |

## Transformer Chains

Transformers run at two points in the pipeline, configured via `next` and
`before`:

### Pre-Collector Chain

Runs after source captures event, before collector processing:

**Bundled mode (flow.json):**

```json
{
  "sources": {
    "browser": {
      "package": "@walkeros/web-source-browser",
      "next": "validate"
    }
  },
  "transformers": {
    "validate": {
      "package": "@walkeros/transformer-validator",
      "next": "enrich"
    },
    "enrich": {
      "package": "@walkeros/transformer-enricher"
    }
  }
}
```

**Integrated mode (TypeScript):**

```typescript
sources: {
  browser: {
    code: sourceBrowser,
    next: 'validate'
  }
},
transformers: {
  validate: {
    code: transformerValidator,
    config: { next: 'enrich' }
  },
  enrich: {
    code: transformerEnrich
  }
}
```

Note: In flow.json, `next` is at the reference level. The CLI bundler
automatically moves it into `config.next` for runtime - you don't need to handle
this yourself.

### Transformer before chain

Each transformer can have its own `before` chain that runs before its push
function:

```json
{
  "transformers": {
    "enrich": {
      "before": "lookup",
      "package": "@walkeros/transformer-enricher"
    },
    "lookup": {
      "package": "@walkeros/transformer-lookup"
    }
  }
}
```

### Post-Collector Chain

Runs after collector enrichment, before destination receives event:

**Bundled mode (flow.json):**

```json
{
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "before": "redact"
    }
  },
  "transformers": {
    "redact": {
      "package": "@walkeros/transformer-redact"
    }
  }
}
```

**Integrated mode (TypeScript):**

```typescript
destinations: {
  gtag: {
    code: destinationGtag,
    before: 'redact'
  }
},
transformers: {
  redact: {
    code: transformerRedact
  }
}
```

### Post-push chain (`destination.next`)

Runs after destination push completes. The push response is available at
`context.ingest._response`:

**Bundled mode (flow.json):**

```json
{
  "destinations": {
    "api": {
      "package": "@walkeros/server-destination-api",
      "next": "auditLog"
    }
  },
  "transformers": {
    "auditLog": {
      "package": "@walkeros/transformer-audit"
    }
  }
}
```

**Integrated mode (TypeScript):**

```typescript
destinations: {
  api: {
    code: destinationApi,
    next: 'auditLog'
  }
},
transformers: {
  auditLog: {
    code: transformerAudit
  }
}
```

### Chain Resolution

- `source.before` → consent-exempt preprocessing chain
- `source.next` → starts pre-collector chain
- `transformer.before` → pre-transform enrichment chain
- `transformer.next` (flow.json) or `transformer.config.next` (runtime) → links
  transformers
- `destination.before` → starts post-collector chain per destination
- `destination.next` → post-push processing chain

## Cross-Flow References (`$flow`)

When a single flow.json defines multiple flows, any flow can pull values from
another flow's `config` block via `$flow.<name>(.<path>)?`. The most common case
is wiring a web flow's API destination to a server flow's deployed URL, so the
two stay in sync without duplication.

```json
{
  "version": 4,
  "flows": {
    "server": {
      "config": {
        "platform": "server",
        "url": "https://collect.example.com"
      },
      "sources": {
        "http": { "package": "@walkeros/server-source-express" }
      }
    },
    "web": {
      "config": { "platform": "web" },
      "destinations": {
        "api": {
          "package": "@walkeros/web-destination-api",
          "config": { "settings": { "url": "$flow.server.url" } }
        }
      }
    }
  }
}
```

`validate` warns on unresolved `$flow` references (lenient), `bundle` errors out
(strict), so production builds never ship with an empty cross-flow value.

## Step Examples

Each step in a flow (source, transformer, destination) can ship **step
examples** -- structured `{ in, out }` pairs that define expected input/output
behavior.

### The Three Type Zones

Steps sit at boundaries between arbitrary formats and walkerOS events:

- **Source:** arbitrary `in` (HTTP request, DOM event) → walkerOS event `out`
- **Transformer:** walkerOS event `in` → walkerOS event `out` (or `false`)
- **Destination:** walkerOS event `in` → arbitrary `out` (vendor API call)

See [using-step-examples](../walkeros-using-step-examples/SKILL.md) for the full
ASCII diagram and detailed explanation.

### Example: Step with Examples in Flow Config

```json
{
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "config": { "measurementId": "G-XXXXXX" },
      "examples": {
        "purchase": {
          "in": {
            "name": "order complete",
            "data": { "id": "ORD-123", "total": 149.97 }
          },
          "out": [
            "event",
            "purchase",
            { "transaction_id": "ORD-123", "value": 149.97 }
          ]
        }
      }
    }
  }
}
```

Step examples enable `it.each` testing, CLI simulation with `--example`, and
deep validation with `--deep`. See
[using-step-examples](../walkeros-using-step-examples/SKILL.md) for the complete
lifecycle.

## Flow Graph Connection Rules

This section defines which components can connect to which, and how chains are
resolved at runtime. Use it as the canonical reference for building flow graphs,
validating configurations, and rendering UI visualizations.

### Valid connection matrix

| From        | To          | Via Field                   | Valid?                |
| ----------- | ----------- | --------------------------- | --------------------- |
| Source      | Transformer | `source.before`             | Yes (consent-exempt)  |
| Source      | Transformer | `source.next`               | Yes (pre-collector)   |
| Source      | Collector   | (implicit, no next)         | Yes                   |
| Source      | Source      | -                           | No                    |
| Source      | Destination | -                           | No                    |
| Transformer | Transformer | `transformer.before`        | Yes (pre-transform)   |
| Transformer | Transformer | `transformer.next`          | Yes (chain continues) |
| Transformer | Collector   | (implicit, pre-chain ends)  | Yes                   |
| Transformer | Destination | (implicit, post-chain ends) | Yes                   |
| Collector   | Destination | (implicit, no before)       | Yes                   |
| Collector   | Transformer | `destination.before`        | Yes (post-chain)      |
| Destination | Transformer | `destination.next`          | Yes (post-push)       |
| Collector   | Source      | -                           | No                    |

### Pre-transformer chains (`source.next`)

- Entry: `source.next: "transformerId"` or `source.next: ["t1", "t2"]`
- Chaining: `transformer.next: "nextId"` walks forward; array stops walking
- Exit: chain ends, event reaches collector
- Multiple sources can reference the same transformer (fan-in)
- No `next` = source connects directly to collector

### Post-transformer chains (`destination.before`)

- Entry: `destination.before: "transformerId"` or
  `destination.before: ["t1", "t2"]`
- Same `transformer.next` chain-walking logic as pre-chains
- Exit: chain ends, event reaches destination
- Multiple destinations can share the same transformer
- No `before` = collector connects directly to destination

### Chain resolution algorithm (`walkChain`)

See
[packages/collector/src/transformer.ts](../../packages/collector/src/transformer.ts)
for the implementation.

- **String start:** walks `transformer.next` links until chain ends
- **Array start:** uses array as-is (explicit chain, no walking)
- **Array `next` inside chain:** appends array elements and stops walking
- **Circular references:** detected via visited set, silently breaks loop
- **Non-existent transformer ID:** chain ends (no error, event proceeds without
  transformation)

### Conditional routing (Route[])

The `next` and `before` properties support conditional routing via `Route[]` -
an array of `{ match, next }` objects evaluated against ingest data:

```json
"next": [
  { "match": { "key": "ingest.path", "operator": "prefix", "value": "/api" }, "next": "api-handler" },
  { "match": "*", "next": "default" }
]
```

- Routes are evaluated in order - first match wins
- No match and no wildcard = event passes through unchanged
- Works on all chain positions: `source.before`, `source.next`,
  `transformer.before`, `transformer.next`, `destination.before`, and
  `destination.next`
- Routes are compiled to closures at init time for fast per-event evaluation
- See [packages/core/src/route.ts](../../packages/core/src/route.ts) for
  `compileNext()` and `resolveNext()`

### Transformer sharing

A single transformer can appear in both pre-chains (`source.next`) and
post-chains (`destination.before`). The same transformer pool is shared; role
depends on which chain references it.

### Deferred activation (`require`)

- `source.config.require: ["consent"]` - source deferred until "consent" event
  fires
- `destination.config.require: ["user"]` - destination deferred until "user"
  event fires
- Multiple requirements: all must be fulfilled (each fires independently)

### Mapping and consent gating

- **Source-level:** `source.config.mapping` and `source.config.consent` -
  applied before pre-chain; blocks event entirely
- **Destination-level:** `destination.config.mapping` and
  `destination.config.consent` - applied after post-chain; skips only that
  destination, queues denied events

### Canvas rendering rules (for UI graph visualization)

- **Shared transformers (pre+post):** duplicate visually with a link indicator;
  editing one updates the other
- **Router fan-out:** keep graph planar; trace edges individually
- **Orphan transformers (not in any chain):** render grey/muted; gain color when
  connected
- **Diamond patterns (fan-in + fan-out):** expected and valid
- **Overlapping `destination.before` chains:** intentional (e.g., shared
  validator for monitoring)

## Related Skills

- [walkeros-understanding-events](../walkeros-understanding-events/SKILL.md) -
  Event model
- [walkeros-understanding-sources](../walkeros-understanding-sources/SKILL.md) -
  Source interface
- [walkeros-understanding-destinations](../walkeros-understanding-destinations/SKILL.md) -
  Destination interface

**Package READMEs:**

- [packages/collector/README.md](../../packages/collector/README.md) - Collector
  details

**Source Files:**

- [packages/collector/src/flow.ts](../../packages/collector/src/flow.ts) -
  startFlow implementation

**Documentation:**

- [Website: Flow](../../website/docs/getting-started/modes/bundled.mdx) - Flow
  concept
- [Website: Collector](../../website/docs/collector/index.mdx) - Collector docs

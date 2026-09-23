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
[Source.before] → Sources → [Source.next] → Collector → [Collector.next] → [Dest.before] → Destinations → [Dest.next]
(Preprocessing)   (Capture)  (Source chain)  (Processing) (Collector chain) (Dest. chain)   (Delivery)     (Post-push)

Consent-exempt:                                                                                   Post-consent:
- Decode           - Validation     - Event creation  - Validation     - Redaction      - Push     - Audit logging
- Validate format  - Enrichment     - Enrichment      - Bot scoring    - Per-vendor     - Send     - Response parsing
- Authenticate     - Redaction      - Consent check   - Drop for all   - Drop for one   - Store    - Webhooks
```

`collector.next` runs once per event before the destination fan-out, so its work
(and a `stop`) applies to every destination. `destination.before` runs per
destination.

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

- Referenced via `$store.storeId` in `env` values (bundled mode) or by passing
  the same store definition object used in `stores` (integrated mode)
- **Init first, destroy last** - stores are available before any source,
  transformer, or destination starts, and outlive them on shutdown
- **No chains** - stores don't participate in the event pipeline. Components
  access them through their `env`.
- Implementations: `@walkeros/server-store-fs` (async, filesystem),
  `@walkeros/server-store-s3` (async, S3-compatible),
  `@walkeros/server-store-gcs`, `@walkeros/server-store-sheets`. The collector
  ships a built-in in-memory cache tier — enable it on any store via
  `Flow.Store.cache` instead of declaring a separate memory store.

```json
{
  "stores": {
    "data": { "package": "@walkeros/server-store-fs" }
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

## Step-Level Primitives

Every step (source, transformer, destination) supports a small set of inline
primitives alongside its package wiring: `cache`, `mapping`, and `consent`.

Event shapes are not a step-level primitive. They live in the top-level
`contract` block (a sibling of `flows`) as named JSON Schemas, and enforcement
is an explicit `@walkeros/transformer-validate` step that references a contract
via `$contract.<name>`. See
[Website: Contract](../../website/docs/getting-started/flow/contract.mdx) for
the contract shape and
[Website: Validate](../../website/docs/getting-started/flow/validate.mdx) for
runtime enforcement.

### How a step references its implementation

Every step picks exactly one of three forms to point at its implementation:

- `package: "<npm-package>"` alone loads the package's default export. The
  common case for sources and destinations.
- `package: "<npm-package>"` plus `import: "<exportName>"` loads a specific
  named export from that package. Use when a package ships multiple named
  exports or has no default export.
- `code: { push, type?, init? }` is inline implementation, no package wiring.
  Useful for one-off custom logic in TypeScript flows.

There is no string form of `code`. A bare step with no `package`, `import`, or
`code` is a valid no-op for all four step kinds (handy as a chain-only or
mapping-only transformer).

## Transformer Chains

Transformers run at three points around the collector, configured via
`source.next`, `collector.next`, and `destination.before` (plus `source.before`,
`transformer.before`, and `destination.next`):

### Source Chain (`source.next`)

Runs after source captures event, before collector processing:

**Bundled mode (flow.json):**

```json
{
  "sources": {
    "browser": {
      "package": "@walkeros/web-source-browser",
      "next": "enrich"
    }
  },
  "transformers": {
    "enrich": {
      "package": "@walkeros/transformer-enricher",
      "next": "redact"
    },
    "redact": {
      "package": "@walkeros/transformer-redact"
    }
  }
}
```

**Integrated mode (TypeScript):**

```typescript
sources: {
  browser: {
    code: sourceBrowser,
    next: 'enrich'
  }
},
transformers: {
  enrich: {
    code: transformerEnrich,
    config: { next: 'redact' }
  },
  redact: {
    code: transformerRedact
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

### Collector Chain (`collector.next`)

Runs once per event after the collector completed it, before the destination
fan-out. Every destination receives its output; a `stop` here reaches no
destination:

```json
{
  "collector": {
    "next": [
      {
        "match": {
          "key": "event.name",
          "operator": "eq",
          "value": "product impression"
        },
        "stop": true
      },
      "bot",
      "validate"
    ]
  }
}
```

In TypeScript it is the top-level `next` of `startFlow({ next, ... })`.

### Destination Chain (`destination.before`)

Runs per destination, after the collector chain, before that destination
receives the event. A `stop` here skips only this destination:

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
- `source.next` → source chain, before the collector
- `transformer.before` → pre-transform enrichment chain
- `transformer.next` (flow.json) or `transformer.config.next` (runtime) → links
  transformers
- `collector.next` → collector chain, once per event, for all destinations
- `destination.before` → destination chain, for that destination only
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

Step examples enable `it.each` testing and cross-step checks in
`walkeros validate`. See
[using-step-examples](../walkeros-using-step-examples/SKILL.md) for the complete
lifecycle.

## Flow Graph Connection Rules

This section defines which components can connect to which, and how chains are
resolved at runtime. Use it as the canonical reference for building flow graphs,
validating configurations, and rendering UI visualizations.

### Valid connection matrix

| From        | To          | Via Field                     | Valid?                 |
| ----------- | ----------- | ----------------------------- | ---------------------- |
| Source      | Transformer | `source.before`               | Yes (consent-exempt)   |
| Source      | Transformer | `source.next`                 | Yes (source chain)     |
| Source      | Collector   | (implicit, no next)           | Yes                    |
| Source      | Source      | -                             | No                     |
| Source      | Destination | -                             | No                     |
| Transformer | Transformer | `transformer.before`          | Yes (pre-transform)    |
| Transformer | Transformer | `transformer.next`            | Yes (chain continues)  |
| Transformer | Collector   | (implicit, source chain ends) | Yes                    |
| Transformer | Destination | (implicit, chain ends)        | Yes                    |
| Collector   | Destination | (implicit, no next/before)    | Yes                    |
| Collector   | Transformer | `collector.next`              | Yes (all destinations) |
| Collector   | Transformer | `destination.before`          | Yes (one destination)  |
| Destination | Transformer | `destination.next`            | Yes (post-push)        |
| Collector   | Source      | -                             | No                     |

### Source chains (`source.next`)

- Entry: `source.next: "transformerId"` or `source.next: ["t1", "t2"]`
- Exit: chain ends, event reaches collector
- Multiple sources can reference the same transformer (fan-in)
- No `next` = source connects directly to collector
- Resolved per event after the source's `state`, so it can route on a loaded
  value

### Collector chain (`collector.next`)

- Entry: `collector.next` (flow.json) or top-level `next` in `startFlow`
- Runs once per completed event, before the destination fan-out
- Exit: every finished copy is delivered to the destinations; a `stop` or a
  transformer returning `false` drops the event for all destinations
- Consent replay, late destinations, and pre-run replay receive its output; it
  never runs twice for one event
- No `next` = collector connects directly to the destinations

### Destination chains (`destination.before`)

- Entry: `destination.before: "transformerId"` or
  `destination.before: ["t1", "t2"]`
- Exit: chain ends, event reaches destination; a `stop` skips only this
  destination
- Multiple destinations can share the same transformer
- No `before` = the collector (or its chain) connects directly to destination
- Per-destination filtering belongs here, not in `collector.next`

### Chain resolution (one model for every chain field)

One runner executes every position (`runTransformerChain` in
[packages/collector/src/transformer.ts](../../packages/collector/src/transformer.ts)),
on top of the pure continuation stack `startChain` / `advanceChain` in
[packages/core/src/chain.ts](../../packages/core/src/chain.ts). Routes are
resolved per hop by `getNextSteps(spec, root)` in
[packages/core/src/route.ts](../../packages/core/src/route.ts), which returns
`NextSteps` (ids plus an optional continuation, a stop, or forks) and needs the
root `{ ingest, event }`.

- **String start:** runs the transformer, then its own `next`, recursively
- **Array start:** the array is the backbone. A member's own `next` (static or
  conditional) is inserted right after that member, then the array continues.
  `["bot", "validate", "session"]` with `bot.next = "foo"` runs bot, foo,
  validate, session. Insertion is depth-first.
- **Lazy per hop:** a route is evaluated only when the event reaches it, against
  `{ ingest, event }` as the previous step left them. A sequence
  `["a", { "match": ..., "stop": true }, "b"]` evaluates the stop after `a` ran.
- **Repeated steps:** a step listed twice runs twice (no dedup, no warning)
- **Cycles:** a member `next` that leads back to a step already on its insertion
  path is skipped; each copy is capped at 256 steps
- **Unknown transformer id:** logged as a warning and skipped, the chain
  continues; `walkeros validate` reports `UNKNOWN_ROUTE_TARGET` as an error
- **Result `{ next }`:** replaces the member's own `next` for that event, then
  the array continues

For tooling without an event, `getRouteGraph(spec, transformers?)` enumerates
every branch of the same compiled form (both sides of each gate, every `one` and
`many` entry, stops marked), so canvases and validators draw exactly what can
run.

### Conditional routing (`one` operator)

The `next` and `before` properties accept a `Route`
(`string | Route[] | RouteConfig`). A `RouteConfig` is a **disjoint union**:
each config sets at most one of `next` (gated link), `one` (first-match
dispatch), `many` (all-match fan-out), or `stop` (drop), never more than one.
Every `match` reads `{ ingest, event }`. The `one` operator picks the first
entry whose `match` succeeds:

```json
"next": {
  "one": [
    { "match": { "key": "ingest.path", "operator": "prefix", "value": "/api" }, "next": "api-handler" },
    { "next": "default" }
  ]
}
```

- `one` entries are evaluated in order, first match wins
- An entry without `match` always matches, use it as the fallback
- No matching entry means the event passes through unchanged
- Works on all chain positions: `source.before`, `source.next`,
  `transformer.before`, `transformer.next`, `collector.next`,
  `destination.before`, and `destination.next`
- An array made only of route configs (no id) is an implicit `one`: first match
  wins. `walkeros validate` hints at it; write `{ "one": [...] }` explicitly
- Routes are compiled once (cached) and resolved per event by `getNextSteps` in
  [packages/core/src/route.ts](../../packages/core/src/route.ts)

### All-match dispatch (`many` operator)

Use `many` when every matching entry should produce an independent copy of the
event (audit-while-process, multi-decoder fan-out). Allowed in every chain
field, at any depth. Each copy finishes the ENTIRE rest of the path on its own
(rest of the array, every enclosing chain, collector, destinations); copies are
never merged. Each copy gets its own `event.id`, derived deterministically from
the parent id and branch position (`deriveSpanId`); `trace` stays shared. One
matching entry continues in place without a copy. A transformer returning
`Result[]` forks the same way.

```jsonc
"next": {
  "many": [
    { "match": { "key": "event.consent.analytics", "operator": "eq", "value": "granted" }, "next": "ga4-pipeline" },
    { "next": "audit-log" }
  ]
}
```

### Dropping an event (`stop`)

`{ "stop": true }` ends the running copy (optionally gated by `match`; a failing
match falls through). In a `many`, a stop ends only its own copy. Meaning per
position:

| Position                                                    | A resolved `stop` means                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `source.before`, `source.next`                              | never reaches the collector; push result `{ ok: true, dropped: true }` |
| `transformer.before`, `transformer.next`, result `{ next }` | the copy ends; the enclosing position applies its meaning              |
| `collector.next`                                            | no destination receives the event (runs before the fan-out)            |
| `destination.before`                                        | this destination skips it; others unaffected                           |
| `destination.next`                                          | post-push chain ends; delivery already happened                        |

"Drop impressions everywhere" is a stop in `collector.next`; "drop impressions
for vendor destinations only" is a stop in those destinations' `before`. A drop
is observable as a `skip` with `skipReason: 'dropped'`. `walkeros validate`
warns about entries after an unconditional stop (dead code).

### Paths and pass-through steps (code-less transformer entries)

A **path** is the multi-step chain through a flow's `transformers` section. A
**pass-through step** (short: **pass**) is a single step inside a path that
declares no `code` and no `package`; the runtime synthesizes its push from the
operative fields the step does declare.

Pass-through steps come in three variants:

- **Chain-only:** only `before` and/or `next` set. A named hop that shares a
  chain across multiple call sites (avoids duplicating arrays).
- **Cache-only:** only `cache` set. A dedup or short-circuit step.
  `cache.stop: true` in a source chain or `collector.next` halts the event for
  all destinations.
- **Mapping-only:** only `mapping: Mapping.Config` set. A declarative
  event-to-event transform that mutates the event in-flight.

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

Transformer step entries follow a **closed schema**: unknown top-level keys are
validation errors, and at least one operative field (`code` / `package` /
`before` / `next` / `cache` / `mapping`) must be set.

See
[walkeros-understanding-transformers](../walkeros-understanding-transformers/SKILL.md)
for full depth on the three variants, the closed-schema rule, and the dual
semantic of `mapping` at the transformer position versus the destination
position.

### Transformer sharing

A single transformer can appear in source chains (`source.next`), the collector
chain (`collector.next`), and destination chains (`destination.before`). The
same transformer pool is shared; role depends on which chain references it. Work
every destination needs belongs in `collector.next`, not repeated in each
`destination.before`.

### Deferred activation (`require`)

- `source.config.require: ["consent"]` - source deferred until "consent" event
  fires
- `destination.config.require: ["user"]` - destination deferred until "user"
  event fires
- Multiple requirements: all must be fulfilled (each fires independently)

### Mapping and consent gating

- **Source-level:** `source.config.mapping` and `source.config.consent` -
  applied before the source chain; blocks event entirely
- **Destination-level:** `destination.config.mapping` and
  `destination.config.consent` - applied after the destination chain; skips only
  that destination, queues denied events (after `collector.next`, so a replay
  never re-runs it)

### Canvas rendering rules (for UI graph visualization)

- **Shared transformers (pre+post):** duplicate visually with a link indicator;
  editing one updates the other
- **Router fan-out:** keep graph planar; trace edges individually
- **Orphan transformers (not in any chain):** render grey/muted; gain color when
  connected
- **Diamond patterns (fan-in + fan-out):** expected and valid
- **Overlapping `destination.before` chains:** intentional (e.g., shared
  validator for monitoring)
- **Collector chain:** draw `collector.next` between the collector and the
  destination fan-out, distinct from per-destination `before` chains; draw a
  `stop` as an end of its branch

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

---
name: walkeros-understanding-destinations
description:
  Use when working with walkerOS destinations, understanding the destination
  interface, or learning about env pattern and configuration. Covers interface,
  lifecycle, env mocking, and paths.
---

# Understanding walkerOS Destinations

## Overview

Destinations receive processed events from the collector and deliver them to
third-party tools (analytics, marketing, data warehouses).

**Core principle:** Destinations transform and deliver. They don't capture or
process—that's sources and collector.

## Destination Interface

See
[packages/core/src/types/destination.ts](../../packages/core/src/types/destination.ts)
for canonical interface.

| Method                      | Purpose                    | Required     |
| --------------------------- | -------------------------- | ------------ |
| `init(context)`             | Load scripts, authenticate | Optional     |
| `push(event, context)`      | Transform and send event   | **Required** |
| `pushBatch(batch, context)` | Batch processing           | Optional     |
| `destroy(context)`          | Cleanup on shutdown        | Optional     |
| `config`                    | Settings, mapping, consent | **Required** |

`destroy?: DestroyFn` — Optional cleanup method. Called during
`command('shutdown')`. Use to close DB connections, flush buffers, or release
SDK clients. Receives `{ id, config, env, logger }`.

## The env Pattern

Destinations use dependency injection via `env` for external APIs. This enables
testing without mocking.

```typescript
// Destination defines its env type
export interface Env extends DestinationWeb.Env {
  window: {
    gtag: Gtag.Gtag;
    dataLayer: unknown[];
  };
}

// Destination uses env, not globals
async function push(event, context) {
  const { env } = context;
  env.window.gtag('event', mappedName, mappedData);
}
```

### Testing with env

**REQUIRED SKILL:** See
[testing-strategy](../walkeros-testing-strategy/SKILL.md) for full testing
patterns.

```typescript
import { mockEnv } from '@walkeros/core';
import { examples } from '../dev';

const calls: Array<{ path: string[]; args: unknown[] }> = [];
const testEnv = mockEnv(examples.env.push, (path, args) => {
  calls.push({ path, args });
});

await destination.push(event, { ...context, env: testEnv });

expect(calls).toContainEqual({
  path: ['window', 'gtag'],
  args: ['event', 'purchase', expect.any(Object)],
});
```

### The env as observability seam

The env pattern is also the interception seam for trace-level vendor-call
capture. At `trace` level the collector may attach an `observe` recorder under
the `observe` key of the env, and `@walkeros/web-core`'s `getEnv` wraps the
callables the destination declared as observable, recording each call. A
destination that reaches its vendor through `getEnv(env)` is automatically
observable; one that reaches a global directly, bypassing `env`, is not. This is
one more reason to route every external call through `env`.

## Destination Config

```typescript
config: {
  settings: { /* destination-specific */ },
  mapping: { /* event transformation rules */ },
  data: { /* global data mapping */ },
  consent: { /* required consent states */ },
  policy: { /* processing rules */ },
  queue: boolean,  // queue events
  dryRun: boolean, // test mode
  queueMax: number,  // consent-queued events cap (default 1000)
  dlqMax: number,    // dead-letter queue cap (default 100)
}
```

## Buffer bounds

Each destination keeps two internal buffers: `queuePush` (consent-denied events)
and `dlq` (failed pushes). Both are size-bounded with FIFO drop-oldest eviction.
Defaults: `queueMax: 1000`, `dlqMax: 100`. Set either on a destination's config
to override per destination. Operators read drop counts from
`collector.status.dropped[stepId('destination', id)]?.queue` (consent-denied
evictions) and `?.dlq` (DLQ evictions). Build the key with `stepId()` from
`@walkeros/core`. Point-in-time sizes stay on
`collector.status.destinations[id].queuePushSize` / `dlqSize`.

## Batch scheduling

Set `config.batch` on a destination (with `pushBatch` implemented) to batch
**all** of its events into one shared buffer. No `'* *'` wildcard mapping rule
is needed. The configuration shape is `batch?: number | { wait?, size?, age? }`
at both the destination-config layer and the mapping-rule layer.

- `wait` (ms): debounce window. The timer resets on every push. Legacy form
  `batch: 1000` is shorthand for `{ wait: 1000 }`.
- `size`: hard count cap. Default `1000`. Flushes immediately when reached.
- `age` (ms): hard age cap since the first entry of the current window. Default
  `30000`. Prevents debounce starvation under sustained load.

A mapping rule's own `batch` splits that entity-action into its own buffer and
overrides `config.batch` per field (`rule ?? config ?? default`). To batch only
specific events, omit `config.batch` and set `batch` on those rules. Pending
batches flush on shutdown.

### Per-event metadata

`Batch.entries[]` carries per-event
`{ event, ingest?, respond?, rule?, data? }`. Destinations that need per-event
request IDs or HTTP responses (BigQuery, mParticle, HubSpot) should read
`entries` instead of assuming all events in a batch share one `ingest`.
`batch.events` and `batch.data` are derived views kept for backward
compatibility.

### Failure handling

If `pushBatch` throws (or returns a rejected Promise), the entire batch is
routed to the destination's `dlq` and `status.destinations[id].failed` is
incremented by the batch size. Per-item retry is the destination SDK's
responsibility (BigQuery, Kafka, HubSpot each have their own backoff semantics).
Counters (`count`, `out`) are bumped only after a successful flush.

Operators also see `status.destinations[id].inFlightBatch`: the number of events
buffered but not yet delivered.

### Out-of-band errors from an EventEmitter SDK

`tryCatchAsync` only catches errors on the awaited `push`/`pushBatch` path. If a
destination owns an SDK object that is an EventEmitter (a BigQuery
`StreamConnection`, a Redis client, a Kafka producer), that object can emit
`'error'` on a detached tick with no awaiter. An EventEmitter that emits
`'error'` with zero listeners throws synchronously and crashes the process.

A destination that owns such an object MUST attach an `'error'` listener and
route the error through `context.reportError`, which is available on every step
context:

- `context.reportError(err)` (no event): a connection-level error between
  pushes. Logs (redacted) and bumps `status.connectionErrors[stepId]`. Does not
  count as a failed event.
- `context.reportError(err, event)`: a specific event was lost. Routes it to the
  DLQ and bumps `failed`, exactly like an in-band push failure.

`reportError` is guarded and must never be called in a way that throws back into
the emitter tick. The Pub/Sub pull source (`sources/gcp/src/pubsub/pull`) is the
reference for attaching an `'error'` listener. The runner's process guards are a
backstop, but the listener is what gives clean DLQ routing, attribution, and
redaction. Optionally pair this with the `breaker` config so a persistently
broken transport stops retrying every event.

## Require vs Consent

Two separate mechanisms control when destinations receive events:

| Mechanism | Purpose              | Scope             | Effect                                                                                 |
| --------- | -------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `require` | Delay initialization | Whole destination | Destination stays in `pending` until all required events fire (e.g., `walker consent`) |
| `consent` | Filter events        | Per-event         | Events without matching consent are silently skipped or queued                         |

**Require** gates the destination _lifecycle_. A destination with
`require: ["consent"]` does not exist in the collector until a
`"walker consent"` event fires. Until then, events are queued internally.

**Consent** gates _individual event delivery_. A destination with
`consent: { marketing: true }` only receives events where the collector's
consent state (or the event's own `consent` field) includes
`{ marketing: true }`.

**State refresh on flush:** When queued events are flushed to a destination,
they receive the _current_ collector state (`consent`, `user`, `globals`) — not
the stale state from when they were originally captured. Any state-mutation
command (`walker consent`, `walker user`, `walker globals`, etc.) triggers a
flush attempt. The consent gate still applies: events without required consent
simply return to the queue.

Both can be combined:

```json
{
  "config": {
    "require": ["consent"],
    "consent": { "marketing": true }
  }
}
```

This means: don't initialize until consent fires, then only accept events with
marketing consent.

**Simulation impact:** `require` causes "destination not found" errors in
`flow_simulate` because the destination stays pending. Remove `require`
temporarily for simulation testing.

## Policy

Policy modifies the event BEFORE mapping rules run. Defined at config level
(applies to all events) or rule level (applies to specific events):

```json
{
  "config": {
    "policy": {
      "user_data.email": {
        "key": "user.email",
        "consent": { "marketing": true }
      }
    }
  }
}
```

Policy supports consent-gated field injection — fields are only added when the
required consent is present in the event.

## Destination Paths

| Type   | Path                            | Examples                             |
| ------ | ------------------------------- | ------------------------------------ |
| Web    | `packages/web/destinations/`    | gtag, meta, api, piwikpro, plausible |
| Server | `packages/server/destinations/` | aws, gcp, meta                       |

## Template Destination

Use as starting point: `packages/web/destinations/plausible/`

## Transformer Wiring

Destinations can wire to post-collector transformer chains via the `before`
property:

```typescript
destinations: {
  gtag: {
    code: destinationGtag,
    before: 'redact'  // First transformer to run before this destination
  }
}
```

The transformer chain runs after collector enrichment, before the destination
receives events. Each destination can have its own chain. See
[understanding-transformers](../walkeros-understanding-transformers/SKILL.md)
for chain details.

## Consent: Two-Layer Pattern

Destinations that integrate vendor SDKs typically need two consent layers:

**Layer 1: `config.consent`** — gates walkerOS event delivery. If consent is not
granted, events don't reach the destination. This is the primary barrier.

**Layer 2: `on('consent')`** — controls vendor SDK internals. Even when walkerOS
stops sending events, the vendor SDK may still run its own behaviors (DOM
capture, polling, fetching configs). Use `on('consent')` to pause/resume these.

```typescript
on(type, context) {
  if (type !== 'consent') return;
  const consent = context.data;
  // Derive from config.consent keys — don't hardcode consent names
  const granted = Object.keys(config.consent || {}).every(k => consent[k]);
  vendorSdk.setOptOut(!granted);
}
```

Both layers are needed for complete consent compliance. `config.consent`
prevents data flow. `on('consent')` prevents vendor SDK side effects.

## Response Delegation (env.respond)

Destinations can customize HTTP responses by calling
`context.env.respond?.({ body, status?, headers? })`. This is useful for
destinations that need to signal success/failure back to the HTTP caller. First
call wins (idempotent). The respond function is optional — only present when the
source provides one.

## Setup (optional)

Destinations can implement an optional `setup()` lifecycle to provision external
resources, for example a BigQuery dataset and table, a Pub/Sub topic, or a
warehouse schema. Setup is **never** invoked by the runtime, push, init, or
deploy. It runs only when an operator explicitly types
`walkeros setup destination.<name>`.

The signature is
`(ctx: LifecycleContext<Config<T>, Env<T>>) => Promise<unknown>`, where
`LifecycleContext` carries `{ id, config, env, logger }`. Idempotency is the
package's responsibility: the framework adds no opinion. Use
`resolveSetup(ctx.config.setup, DEFAULTS)` from `@walkeros/core` to normalize
the `boolean | object` shape into a concrete options object.

See [walkeros-create-destination](../walkeros-create-destination/SKILL.md),
[walkeros-understanding-sources](../walkeros-understanding-sources/SKILL.md),
[walkeros-understanding-stores](../walkeros-understanding-stores/SKILL.md), and
the `walkeros setup` CLI documentation for the authoring template and operator
workflow.

## Related Skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) - How
  destinations fit in architecture
- [walkeros-understanding-mapping](../walkeros-understanding-mapping/SKILL.md) -
  Configure transformations
- [walkeros-create-destination](../walkeros-create-destination/SKILL.md) -
  Create new destination

**Source Files:**

- [packages/core/src/types/destination.ts](../../packages/core/src/types/destination.ts) -
  Interface

**Package READMEs:**

- [packages/web/destinations/gtag/README.md](../../packages/web/destinations/gtag/README.md) -
  gtag example
- [packages/web/destinations/plausible/README.md](../../packages/web/destinations/plausible/README.md) -
  Plausible (template)

**Documentation:**

- [Website: Destinations](../../website/docs/destinations/index.mdx) - Overview
- [Website: Create Your Own](../../website/docs/destinations/create-your-own.mdx) -
  Guide

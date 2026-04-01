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
}
```

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

## Response Delegation (env.respond)

Destinations can customize HTTP responses by calling
`context.env.respond?.({ body, status?, headers? })`. This is useful for
destinations that need to signal success/failure back to the HTTP caller. First
call wins (idempotent). The respond function is optional — only present when the
source provides one.

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

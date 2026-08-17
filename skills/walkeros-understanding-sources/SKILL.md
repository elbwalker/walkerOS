---
name: walkeros-understanding-sources
description:
  Use when working with walkerOS sources, understanding event capture, or
  learning about the push interface. Covers browser, dataLayer, and server
  source patterns.
---

# Understanding walkerOS Sources

## Overview

Sources capture events from the external world (browser DOM, dataLayer, HTTP
requests, cloud functions) and feed them to the collector.

**Core principle:** Sources capture. They don't process or deliver—that's
collector and destinations.

## Source Interface

See [packages/core/src/types/source.ts](../../packages/core/src/types/source.ts)
for canonical interface.

### Init Function (Context Pattern)

Sources use a context-based initialization pattern:

```typescript
import type { Source } from '@walkeros/core';

export const sourceMySource: Source.Init<Types> = async (context) => {
  const { config = {}, env, logger, id } = context;
  // ...
};
```

**Context contains:**

| Property    | Type                                 | Purpose                                                  |
| ----------- | ------------------------------------ | -------------------------------------------------------- |
| `config`    | `Source.Config<T>`                   | Settings, mapping, options                               |
| `env`       | `Types['env']`                       | Environment (push, logger)                               |
| `logger`    | `Logger`                             | Logging functions                                        |
| `id`        | `string`                             | Source identifier                                        |
| `collector` | `Collector.Instance`                 | Reference to collector                                   |
| `withScope` | `(raw, respond, body) => Promise<R>` | Bind ingest + respond to a single scope (server sources) |

### Push Method

| Method        | Purpose                             |
| ------------- | ----------------------------------- |
| `push(input)` | Receive external input, emit events |

### Init Method

`init?: () => void | Promise<void>` — Optional eager-startup hook on the
returned `Source.Instance`. The factory must be **side-effect-free**: build the
instance and return it. The collector calls `init()` on every source eagerly
after all factories register, regardless of `config.require`. Use `init` for
work that previously sat in the factory body: adopting a pre-init window queue
(e.g., `window.elbLayer`), attaching DOM listeners, opening sockets,
intercepting `window.dataLayer`. After `init` runs the collector flips
`Source.Config.init` to `true`.

### queueOn Buffer

`queueOn?: Array<{ type: On.Types; data: unknown }>` — Optional buffer on the
`Source.Instance` for lifecycle events delivered before the source is
**started** (started ≡ `config.init === true && !config.require?.length`). The
collector pushes `{ type, data }` here when it would otherwise call
`source.on(type, data)`. Once the source becomes started, the collector replays
each entry via `source.on(...)` and clears the queue.

### Destroy Method

`destroy?: DestroyFn` — Optional cleanup method. Called during
`command('shutdown')`. Use to close HTTP servers, timers, or connections.
Receives `{ id, config, env, logger }`.

## Source Lifecycle

The collector and every source agree on three lifecycle markers, all on
`Source.Config`:

| Field                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init?: boolean`     | Set by the collector to `true` after `Instance.init()` resolves. Authors do not write to it. Reflects "init has run", not "is started".                                                                                                                                                                                                                                                                                                      |
| `require?: string[]` | Author-supplied **timing hint**. Lists collector state a source needs before its first `on()` delivery. Satisfied by the collector's **current recorded state** (level), not only by a future event — so order does not matter: the gate clears whether the required state was recorded before or after this source registered. It is not a correctness dependency: a source reacts to state correctly whether or not it declares `require`. |
| `disabled?: boolean` | Hard skip — no factory invocation, no init, no event capture.                                                                                                                                                                                                                                                                                                                                                                                |

The flow is:

1. **Register** — collector invokes the factory. Factory returns a fresh
   `Source.Instance` with no side effects.
2. **Init pass** — collector calls `Instance.init()` on every registered source,
   then sets `config.init = true`.
3. **Lifecycle delivery** — for each collector event (`consent`, `user`,
   `session`, `run`, …) the collector decrements every source's `require` in
   place AND reconciles every still-pending source/destination against current
   state, so a gate also clears from state that was already recorded. If a
   source is started, it calls `source.on(type, data)` directly. Otherwise it
   pushes `{ type, data }` into `Instance.queueOn`.
4. **Replay** — when a source becomes started (require empties), the collector
   replays its `queueOn` via `source.on(...)` and clears the queue.

`require` therefore gates the **timing** of `on()` delivery, not code execution
and not correctness. `Instance.init()` always runs eagerly. There is no
`collector.pending.sources` map: per-source state lives entirely on
`Source.Instance` and `Source.Config`.

### Exactly-once state delivery is a collector guarantee

State commands (`consent`, `user`, `globals`, `custom`) are recorded by the
collector immediately, even before `run`, and delivered to each source's `on`
handler exactly once per change. The collector tracks what each subscriber has
already received, so re-running or re-registering never double-fires a state
reaction. Sources should **not** hand-roll their own deduplication for state
deliveries: the collector enforces exactly-once, and delivery is
order-independent (it does not depend on source init order or on whether the
state arrived before or after `run`).

This mirrors the destination model: `Destination.Instance.init` handles one-time
bootstrap, `Destination.Config.init` is the collector-managed "init has run"
flag, and `Destination.Config.require` gates event delivery the same way. See
[walkeros-understanding-destinations](../walkeros-understanding-destinations/SKILL.md).

### Pre-run events are held and replayed by the collector

Events a source emits before the collector runs are held in a bounded FIFO
buffer (`collector.preRunQueue`, capped by `config.queueMax`) and replayed at
`run`, with the pipeline running once at replay time. A source therefore does
**not** need bespoke `on('run')` deferral to avoid losing its startup events.
Deferring emission to `on('run')` is still fine and often clearer for
**ordering** (the session source does this so `session start` lands in the
post-run pipeline), but it is no longer a loss-protection requirement.

The one case that still needs an explicit run gate is a **queue consumer**
(`pubsub-pull`, `sqs`): starting to consume means acknowledging messages to a
broker, and an ack must never precede delivery. These sources start their
subscription or poll loop in `on('run')` and never ack a message the pipeline
did not accept (`result.ok === false` routes to the source's `onPushError`
disposition, nack by default).

## Push Signatures by Type

| Source Type    | Signature                           | Example      |
| -------------- | ----------------------------------- | ------------ |
| Cloud Function | `push(req, res) → Promise<void>`    | HTTP handler |
| Browser        | `push(event, data) → Promise<void>` | DOM events   |
| DataLayer      | `push(event, data) → Promise<void>` | GTM-style    |

**Key insight:** Source `push` IS the handler. No wrappers needed.

```typescript
// Direct deployment
http('handler', source.push);
```

**Do not confuse `Instance.push` with `env.push`.** They point opposite ways:

- `Instance.push` is **inward**: the handler callers hand input to (an HTTP
  request, a `window.elb(...)` call, a synthetic test message). `startFlow`
  exports the primary source's `Instance.push` as its `elb`.
- `env.push` is **outward**: where the source sends the events it produced.

A source can legitimately have both, and they need not be related: the browser
source's `Instance.push` is a flexible `BrowserPush` that accepts commands and
argument forms, while its events leave via `env.push`. The dataLayer and session
sources keep `Instance.push: env.elb`, because callers do not feed them events
at all — they capture from `dataLayer.push` and from session detection
respectively.

When a test or integration code needs to invoke a source's `push` through the
collector bag, `collector.sources` erases the per-source generic on read. Use
`Source.getSource<T>(collector, id)` to recover the narrow signature without a
cast. See the testing-strategy skill for the full pattern (symmetric helpers
exist for destinations, transformers, stores).

## Source Paths

| Type   | Path                       | Examples           |
| ------ | -------------------------- | ------------------ |
| Web    | `packages/web/sources/`    | browser, dataLayer |
| Server | `packages/server/sources/` | gcp                |

## Browser Source

The browser source captures events from DOM using data attributes.

```html
<button data-elb="product" data-elb-product="id:P123;name:Laptop">
  <span data-elbaction="click">Add to Cart</span>
</button>
```

See [packages/web/sources/browser/](../../packages/web/sources/browser/) for
implementation.

### Parallel sources

Several browser sources can run on one page. Trigger, element, and visibility
state is per source, and the DOM is shared: any number of sources may scan the
same node, each emitting into its own pipeline. Only two resources are single
slots, `window[elb]` and the named `elbLayer` array, and each belongs to the
first source that takes it. A source refused one of them logs an error and keeps
capturing without it. Give each parallel flow its own `elb` and `elbLayer` name,
or `elb: false` and `elbLayer: false` for an embedded source with no page-window
footprint.

Full contract, recipes, and known limits:
[Multiple sources on one page](../../website/docs/sources/web/browser/index.mdx).

## DataLayer Source

Captures events from a GTM-style dataLayer array.

```typescript
window.dataLayer.push({
  event: 'product view',
  product: { id: 'P123', name: 'Laptop' },
});
```

See [packages/web/sources/dataLayer/](../../packages/web/sources/dataLayer/) for
implementation.

## Server Sources

Handle HTTP requests in cloud functions. Server sources use the context pattern:

```typescript
import type { Source } from '@walkeros/core';

export const sourceCloudFunction: Source.Init<Types> = async (context) => {
  const { config = {}, env } = context;
  const { push: envPush } = env;

  // Apply defaults inline — flow.json is developer-controlled, so no
  // runtime validation. Shape checks live in ./schemas and are used by
  // `walkeros validate` and dev tooling, never at runtime.
  const userSettings = config.settings || {};
  const settings = {
    ...userSettings,
    // example default: port: userSettings.port ?? 3000,
  };

  const push = async (req: Request, res: Response): Promise<void> => {
    // Transform HTTP request → walkerOS event
    const event = transformRequest(req);
    await envPush(event);
    res.json({ success: true });
  };

  return { type: 'cloudfunction', config: { ...config, settings }, push };
};

// Direct deployment
export const handler = source.push;
```

See [packages/server/sources/gcp/](../../packages/server/sources/gcp/) for
implementation.

## Env Pattern (Dependency Injection)

Platform dependencies go through `env` with fallback to globals or direct
imports. This enables testing and simulation without touching globals.

```typescript
// Express source: env.express ?? express (import fallback)
const expressLib = env.express ?? express;
const app = expressLib();

// Web sources: env.window ?? window (global fallback)
const win = env.window ?? window;
const doc = env.document ?? document;
```

Every source's `Env` interface extends `Source.BaseEnv` with optional platform
deps:

```typescript
export interface Env extends Source.BaseEnv {
  window?: Window & typeof globalThis; // web sources
  document?: Document; // web sources
  express?: typeof express; // express source
  cors?: typeof cors; // express source
}
```

Tests inject mocks via `env` instead of mocking globals. See
[testing-strategy](../walkeros-testing-strategy/SKILL.md).

### `env.push` for events, `env.elb` for commands

`BaseEnv` gives every source two outward exits, and they are not
interchangeable:

| Exit       | Use for                         | What it is                                          |
| ---------- | ------------------------------- | --------------------------------------------------- |
| `env.push` | **Events** (event objects only) | The collector's per-source pipeline (`wrappedPush`) |
| `env.elb`  | **`walker *` commands**         | The raw collector adapter                           |

Emit events through `env.push`. That is what makes the source's own
`next`/`before` chains, `mapping` (including `ignore` and `consent`), `cache`,
`state`, per-source `Ingest`, and `collector.status.sources.<id>` apply. A
source that emits events through `env.elb` bypasses all of it, so those config
fields become silently dead: accepted, never executed.

Commands must keep using `env.elb`. `env.push` takes `WalkerOS.DeepPartialEvent`
only, so a command string has no meaning there.

Both exits, plus `env.command`, `env.logger` and `env.sources`, are
runtime-owned: the collector writes these five capabilities into the env LAST,
so an author value for any of them is ignored, uniformly. `env` stays the
author's bag for platform and vendor dependencies only. To end the pipeline
somewhere else, declare `terminus` on the source registration (a sibling of
`code`); it is explicit and TOTAL, and stored flow configs cannot carry it
(validation rejects unknown source keys).

```typescript
// Event → pipeline
await env.push({ name: 'page view', data: { title } });

// Command → raw collector
await env.elb('walker consent', { marketing: true });
```

Call `env.push` with the event alone. The collector supplies `id`, `ingest`,
`mapping` and `preChain` itself; passing your own `options` is for server
sources threading a per-request scope via `context.withScope`.

Two consequences worth knowing when testing a source:

- The pipeline's end is captured **when the source is constructed**. Replacing
  `collector.push` after `startFlow` resolves is invisible to pipeline pushes,
  so assert on a spy **destination** instead of a `collector.push` mock. For a
  deterministic raw capture at the source→collector boundary, declare `terminus`
  on the registration: it receives the event exactly as the source emitted it,
  and the ENTIRE pipeline is skipped (no `before`/`next` chains, no `cache`, no
  `state`, no `mapping`, no minted span id, no ingest, no `respond`, no
  `status.sources` counting, no Observe records).
- A `next`/`before` chain adds `await` hops between the emit and delivery. For a
  fire-and-forget emit, settle microtasks before asserting.

## Transformer Wiring

Sources can wire to pre-collector transformer chains via the `next` property:

```typescript
sources: {
  browser: {
    code: sourceBrowser,
    next: 'validate'  // First transformer to run after this source
  }
}
```

The transformer chain runs before events reach the collector. See
[understanding-transformers](../walkeros-understanding-transformers/SKILL.md)
for chain details.

## Per-Scope Context (server sources)

A single source factory instance handles many concurrent invocations: Express
processes overlapping requests, Lambda reuses one handler across calls, queue
consumers loop over messages. Each logical unit of work is a **scope**. Server
sources MUST wrap each invocation with
`context.withScope(rawScope, respond, body)`:

```typescript
const push = async (req, res) => {
  const respond = createRespond((options) => {
    /* wire options into res */
  });

  await context.withScope(req, respond, async (env) => {
    await env.push(parsedData);
  });
};
```

Inside `body`, `env.push` carries that scope's `ingest` (extracted from
`rawScope` via `config.ingest` mapping) and `respond` end to end through the
pipeline. Concurrent scopes never share ingest or respond.

**Browser sources skip `withScope`.** A browser tab is a single logical scope
for its lifetime; calling `env.push` directly is correct.

## Response Delegation (env.respond)

When a server source passes a `respond` to `withScope`, every transformer and
destination in the pipeline can call
`env.respond?.({ body, status?, headers? })` to customize the HTTP response.
First call wins (`createRespond` is idempotent), so the source's default
response is a no-op if a step already responded.

See `@walkeros/server-source-express` for the reference implementation.

## createTrigger Pattern

Every source exports a `createTrigger` factory from its examples (`dev` entry)
that follows the unified `Trigger.CreateFn` interface:

```typescript
type CreateFn<TContent, TResult> = (
  config: Collector.InitConfig,
  options?: unknown,
) => Promise<Trigger.Instance<TContent, TResult>>;
```

`createTrigger` simulates real-world invocations from the outside — full
blackbox, no source instance access. Each package implements it differently:

| Source  | Content        | Trigger type       | Mechanism               |
| ------- | -------------- | ------------------ | ----------------------- |
| Browser | HTML string    | `click`, `load`... | DOM injection + events  |
| Express | HTTP req shape | `POST`, `GET`      | Real `fetch()` requests |

The trigger lazily calls `startFlow(config)` on first invocation. Tests capture
events via spy destinations. See
[using-step-examples](../walkeros-using-step-examples/SKILL.md) for testing
patterns.

## Setup (optional)

Sources can implement an optional `setup()` lifecycle to provision external
resources, for example registering a webhook with a third-party provider,
creating a Pub/Sub subscription, or pre-allocating queue resources. Setup is
**never** invoked by the runtime, push, init, or deploy. It runs only when an
operator explicitly types `walkeros setup source.<name>`.

The signature is
`(ctx: LifecycleContext<Config<T>, Env<T>>) => Promise<unknown>`, where
`LifecycleContext` carries `{ id, config, env, logger }`. Idempotency is the
package's responsibility: the framework adds no opinion. Use
`resolveSetup(ctx.config.setup, DEFAULTS)` from `@walkeros/core` to normalize
the `boolean | object` shape into a concrete options object.

See [walkeros-create-source](../walkeros-create-source/SKILL.md),
[walkeros-understanding-destinations](../walkeros-understanding-destinations/SKILL.md),
[walkeros-understanding-stores](../walkeros-understanding-stores/SKILL.md), and
the `walkeros setup` CLI documentation for the authoring template and operator
workflow.

## Related Skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) - How
  sources fit in architecture
- [walkeros-understanding-events](../walkeros-understanding-events/SKILL.md) -
  Events that sources emit
- [walkeros-create-source](../walkeros-create-source/SKILL.md) - Create new
  source

**Source Files:**

- [packages/core/src/types/source.ts](../../packages/core/src/types/source.ts) -
  Interface

**Package READMEs:**

- [packages/web/sources/browser/README.md](../../packages/web/sources/browser/README.md) -
  Browser source
- [packages/web/sources/dataLayer/README.md](../../packages/web/sources/dataLayer/README.md) -
  DataLayer source

**Documentation:**

- [Website: Sources](../../website/docs/sources/index.mdx) - Overview
- [Website: Browser Source](../../website/docs/sources/web/browser/index.mdx) -
  Browser docs
- [Website: Create Your Own](../../website/docs/sources/create-your-own.mdx) -
  Guide

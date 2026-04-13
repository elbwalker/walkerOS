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

| Property     | Type                 | Purpose                          |
| ------------ | -------------------- | -------------------------------- |
| `config`     | `Source.Config<T>`   | Settings, mapping, options       |
| `env`        | `Types['env']`       | Environment (push, logger)       |
| `logger`     | `Logger`             | Logging functions                |
| `id`         | `string`             | Source identifier                |
| `collector`  | `Collector.Instance` | Reference to collector           |
| `setIngest`  | `(value) => void`    | Set ingest metadata per request  |
| `setRespond` | `(fn) => void`       | Set respond function per request |

### Push Method

| Method        | Purpose                             |
| ------------- | ----------------------------------- |
| `push(input)` | Receive external input, emit events |

### Destroy Method

`destroy?: DestroyFn` — Optional cleanup method. Called during
`command('shutdown')`. Use to close HTTP servers, timers, or connections.
Receives `{ id, config, env, logger }`.

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

## Response Delegation (env.respond)

Server sources can delegate HTTP response handling to downstream steps via
`setRespond`. Call `createRespond(sender)` to create an idempotent respond
function, then pass it via `context.setRespond(respond)` before pushing events.

Any transformer or destination in the pipeline can call
`env.respond?.({ body, status?, headers? })` to customize the response. First
call wins — the source's default response is a no-op if a step already
responded.

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

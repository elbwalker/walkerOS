---
name: walkeros-create-source
description: >-
  Use when creating a new walkerOS source to capture events (browser source,
  dataLayer interception, server/HTTP source, webhook receiver, event capture),
  web or server-side. Example-driven workflow: research the input format and
  define step examples before implementing the push interface, createTrigger,
  and env pattern.
---

# Create a New Source

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../walkeros-understanding-flow/SKILL.md) - How sources
  fit in architecture
- [understanding-sources](../walkeros-understanding-sources/SKILL.md) - Source
  interface
- [understanding-transformers](../walkeros-understanding-transformers/SKILL.md) -
  Transformer chaining from sources
- [understanding-events](../walkeros-understanding-events/SKILL.md) - Event
  structure sources emit
- [understanding-mapping](../walkeros-understanding-mapping/SKILL.md) -
  Transform raw input to events
- [testing-strategy](../walkeros-testing-strategy/SKILL.md) - How to test with
  env pattern and dev examples
- [using-step-examples](../walkeros-using-step-examples/SKILL.md) -
  Authoritative `Flow.StepExample` pattern, `createTrigger`, Three Type Zones
- [using-logger](../walkeros-using-logger/SKILL.md) - For an HTTP source, see
  "Choosing a level on public endpoints": rejected client input is debug or warn
  plus a `rejected` counter and a 4xx, never an error-level log
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards (for Phase 9)

## Source Types

A source's identity is split into two fields:

| Field             | Meaning                                                         | Examples                                       |
| ----------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| `source.type`     | The kind of source (its role / mechanism)                       | `browser`, `dataLayer`, `cookiefirst`, `fetch` |
| `source.platform` | The runtime that hosts the source (`web`, `server`, `app`, ...) | `web`, `server`                                |

| Platform | Input                   | Example types                                 |
| -------- | ----------------------- | --------------------------------------------- |
| `web`    | DOM events, dataLayer   | `browser`, `dataLayer`                        |
| `server` | HTTP requests, webhooks | `express`, `fetch`, `lambda`, `cloudfunction` |

## Augmenting `SourceMap`

Every source registers its `type` literal and any source-specific `source.*`
fields by augmenting `SourceMap` from `@walkeros/core`. This is how the
collector and downstream consumers know about the new source kind without
loosening the union to `string`.

Add this to the source's `src/types.ts` (or `src/types/index.ts`):

```typescript
import type { Source, Elb } from '@walkeros/core';

declare module '@walkeros/core' {
  interface SourceMap {
    // Replace `mySource` with the source's package-level identifier.
    mySource: {
      type: 'mySource'; // matches the literal you return from Source.Init
      platform?: 'web'; // 'web' | 'server' | 'app' | ...
      // Add any extra fields the source surfaces in `event.source.*` here.
      // e.g. `version?: string;` is already on the base Source - only add
      // truly source-specific keys.
    };
  }
}
```

Reference implementations: `packages/web/sources/browser/src/types/index.ts`,
`packages/web/sources/demo/src/types.ts`. Conflicting declarations cause compile
errors on purpose, this surfaces naming collisions early.

## Source Categories

| Category           | Purpose                                   | Examples                | Key Concern          |
| ------------------ | ----------------------------------------- | ----------------------- | -------------------- |
| **Transformation** | Convert external format → walkerOS events | `dataLayer`, `fetch`    | Mapping accuracy     |
| **Transport**      | Receive events from specific platform     | `gcp`, `aws`, `express` | Platform integration |

## Choose Your Template

| Complexity            | Template       | When to Use                           |
| --------------------- | -------------- | ------------------------------------- |
| Simple transformation | `fetch/`       | Generic HTTP handler, data conversion |
| Platform transport    | `gcp/`, `aws/` | Cloud platform integration            |
| Browser interception  | `dataLayer/`   | DOM events, array interception        |

## Process Overview

```
1. Research     → Deeply understand external system, SDK, and data format
2. Classify     → Determine source type and integration approach
3. Examples     → Define in/out pairs FIRST (start with the end result)
4. Mapping      → Define input → walkerOS event transformation
5. Scaffold     → Copy template and configure
6. Convention   → Add walkerOS.json metadata and buildDev
7. Implement    → Build using examples as test fixtures
8. Test         → Verify against example variations
9. Document     → Write README
```

---

## Phase 1: Research

**Goal:** Deeply understand the external system before writing any code.
Research quality determines implementation quality.

### 1.1 Find and Install Official SDK

Always prefer the vendor's official SDK package over raw HTTP API calls. The SDK
handles transport, data formatting, and platform specifics - don't reinvent
these.

- [ ] **Install the SDK** - `npm install @vendor/sdk` and read the actual source
- [ ] **Read TypeScript types** - Import types from the SDK package directly.
      Never duplicate type definitions. This ensures IntelliSense completeness
      and consistency with SDK updates.
- [ ] **Understand the full API surface** - List every public method and type
      export. What data structures does the platform provide? What request/event
      formats exist?

```bash
# Search npm for official packages
npm search [vendor-name]
npm search @[vendor]

# Install and inspect actual types
npm install @vendor/sdk
ls node_modules/@vendor/sdk/lib/esm/
```

### 1.2 Understand SDK Architecture

- [ ] **Init options** - What does the SDK expose? How is the platform
      connection established?
- [ ] **Call ordering** - When does data arrive? Is it pushed (webhooks,
      callbacks) or pulled (polling, intercepting)? What are the timing
      implications?
- [ ] **Data format** - What does the raw event/request look like? Headers, body
      structure, query params, authentication tokens?
- [ ] **Identity signals** - Does the external system provide user IDs, session
      IDs, device IDs? How are they delivered (headers, cookies, body fields)?
- [ ] **Consent** - Does the platform have consent signals? How are they
      communicated?

### 1.3 Identify All Data Entry Points

Go beyond just the primary event payload. Most external systems provide multiple
data channels:

| Data Channel     | Examples                            | walkerOS Handling    |
| ---------------- | ----------------------------------- | -------------------- |
| Event payload    | Request body, DOM event data        | Default `push()`     |
| Headers/metadata | Auth tokens, content-type, origin   | `context` or `user`  |
| Query params     | UTM parameters, tracking IDs        | `data` or `context`  |
| Platform context | Cloud function metadata, Lambda ctx | `source` or `custom` |
| Identity         | User ID, session ID, device ID      | `user`               |
| Consent signals  | Opt-in/out flags, consent string    | `consent`            |

### 1.4 Check Existing Patterns

Review similar sources in the codebase:

```bash
# List existing sources
ls packages/web/sources/
ls packages/server/sources/

# Reference implementations
# - dataLayer: DOM-based, array interception
# - express: HTTP middleware
# - fetch: Generic HTTP handler (simplest server pattern)
# - gcp: Cloud Functions specific
```

### Gate: Research Complete

- [ ] Official SDK installed and types inspected (or HTTP API documented if no
      SDK exists)
- [ ] All data entry points listed with their format
- [ ] Init options and call ordering understood
- [ ] Identity and consent signal delivery documented
- [ ] Raw event/request structure mapped to walkerOS event fields

### Checkpoint: Research Review (Optional)

If working with human oversight, pause here to confirm:

- SDK integration approach correct?
- Data capture strategy makes sense for the use case?
- Any platform quirks or limitations to handle?

---

## Phase 2: Classify Source Type

**Goal:** Understand what the source captures and how it delivers data, which
determines implementation complexity.

### 2.1 Source Categories

| Category           | Description                                | Mapping Needed                  | Example Sources          |
| ------------------ | ------------------------------------------ | ------------------------------- | ------------------------ |
| **Transformation** | Converts external event format to walkerOS | Essential - must map fields     | `dataLayer`, `fetch`     |
| **Transport**      | Receives events from a specific platform   | Structural - platform unwrap    | `gcp`, `aws`, `express`  |
| **Interception**   | Intercepts existing data flows             | Varies - depends on data format | `dataLayer`, CMP sources |

### 2.2 Determine Integration Approach

| Approach                    | When to use                         | Pattern                                                   |
| --------------------------- | ----------------------------------- | --------------------------------------------------------- |
| **Platform SDK as host**    | SDK provides typed request/response | Use SDK types, wrap handler in walkerOS source            |
| **DOM interception**        | Capture browser-side events         | Listen to DOM events, intercept arrays/globals            |
| **HTTP handler**            | Generic webhook/API receiver        | Parse request, extract events, forward to collector       |
| **Callback/event listener** | Platform provides event emitter     | Register listener, transform events, forward to collector |

**Prefer the vendor SDK** - it provides typed request/response objects and
handles platform specifics. Raw HTTP parsing is a fallback when no SDK exists.

When using the vendor SDK:

- Import types from the SDK package directly
- Use SDK request/response types for handler signatures
- Let the SDK handle platform-specific parsing (body parsing, header extraction)

For an HTTP handler, forward the full `DeepPartialEvent` the body carries,
renaming only the wire-level event-name key. Never project the body through a
field allowlist: that strips `source` provenance (`release`, `trace`) and other
legitimate fields. `express` and `fetch` are the reference pass-through
implementations.

### Gate: Classification Complete

- [ ] Source category identified (transformation / transport / interception)
- [ ] Integration approach chosen (SDK / DOM / HTTP / callback)
- [ ] Know what the source captures and how it delivers data

---

## Phase 3: Create Input Examples (BEFORE Implementation)

**Mandatory.** Examples are the test fixtures for Phase 8. Define expected
`trigger` / `in` / `out` triples FIRST - start with the end result in mind.
Without examples, you cannot test. Even for simple sources, step examples are
the single source of truth for tests, simulations, and documentation.

> **Authoritative pattern:** See
> [using-step-examples](../walkeros-using-step-examples/SKILL.md) for the Three
> Type Zones, `createTrigger` contract, and CI integration. This skill reuses
> that contract - do not diverge.

### 3.1 Scaffold Directory Structure

```bash
mkdir -p packages/<platform>/sources/[name]/src/examples
mkdir -p packages/<platform>/sources/[name]/src/{schemas,types}
```

### 3.2 Required Files (3-4 files)

Use this layout in `src/examples/`. Every example a test reads lives in
`step.ts`; do not add `inputs.ts`, `outputs.ts`, `requests.ts` or a standalone
`mapping.ts`.

| File                  | Required? | Purpose                                                             |
| --------------------- | --------- | ------------------------------------------------------------------- |
| `examples/step.ts`    | yes       | `Flow.StepExample` entries with `trigger` / `in` / `out` triples    |
| `examples/trigger.ts` | yes       | `createTrigger` implementation following `Trigger.CreateFn`         |
| `examples/index.ts`   | yes       | Barrel exports: `env` (if present), `step`, `createTrigger`         |
| `examples/env.ts`     | if needed | Mock env for platform deps (browser window/document, express, etc.) |

`env.ts` is included whenever the source touches platform globals or injected
deps (browser, dataLayer, demo, the Lambda and Cloud Function sources). Sources
whose tests drive the collector entirely through `trigger.ts` (e.g.
`web/sources/session`, `server/sources/express`) may omit it. When in doubt,
**include it**.

Some existing packages also keep fixture files their own tests import (fetch:
`inputs.ts`, `requests.ts`; dataLayer: `events.ts`, `mapping.ts`; the CMP
sources: `inputs.ts`, `outputs.ts`). A new source does not add them: anything a
test needs goes into `step.ts`.

### 3.3 Three Type Zones for Sources

Sources are the **inverse** of destinations in the Three Type Zones model:

| Zone      | Source semantics                                                                      |
| --------- | ------------------------------------------------------------------------------------- |
| `trigger` | How to simulate the invocation (HTTP method, DOM event type, cloud event)             |
| `in`      | External trigger content - HTTP request, DOM HTML, SDK payload (NOT a walkerOS event) |
| `out`     | What the source hands the collector: `['elb', event]` tuples (`Flow.StepOut`)         |

Where a destination does `WalkerOS.Event → vendor output`, a source does
`external content → ['elb', event]`. Read
[using-step-examples](../walkeros-using-step-examples/SKILL.md) before authoring
entries.

### 3.4 Typing Rules (strict)

**No `any`.** Every example value must be explicitly typed.

- **`trigger`** uses the local source trigger type or a platform-native type
  (e.g. `'load' | 'click'` for DOM, HTTP method strings for server sources).
- **`in`** uses the **vendor / platform SDK types** imported from the official
  package whenever available (Express `Request`, Fetch `Request`, API Gateway
  `APIGatewayProxyEvent`, Lambda `Context`, GCP `CloudEvent`, etc.). Do not
  invent local request types when the platform publishes them.
- **`out`** lists `['elb', event]` tuples; each event is a
  `WalkerOS.DeepPartialEvent` (what the source pushes, before the collector
  completes it).
- **Step entries** are typed `Flow.StepExample` from `@walkeros/core`.
- **Mock env** is typed against the source's local `Env` type from `../types`.
- `createTrigger` is typed as `Trigger.CreateFn<unknown, Result>` and narrows
  its content to the source's own `Content` with a type guard: a simulation
  passes any JSON, and the conformance kit's `createTrigger` option is a
  `Trigger.CreateFn`, which a `CreateFn<Content, Result>` does not satisfy.

### 3.5 Code Template - `examples/step.ts`

```typescript
import type { Flow } from '@walkeros/core';

// One step example per captured trigger / input shape.
// `trigger` tells createTrigger how to simulate the invocation.
// `in` is the platform-specific content (HTTP request, DOM HTML, SDK payload),
//      typed against the platform SDK's published types where available.
// `out` lists what the source hands the collector, as ['elb', event] tuples.

// Set `title` + `description` for public examples; mark test-only fixtures
// with `public: false`. See
// [walkeros-using-step-examples](../walkeros-using-step-examples/SKILL.md).

// Browser example (the browser source's own): a page load.
export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page load trigger captures the current URL, title, and referrer as a walker page view event.',
  trigger: {
    type: 'load',
    options: {
      url: 'https://example.com/docs',
      title: 'Documentation',
      referrer: 'https://example.com/',
    },
  },
  in: '', // no external content: DOM-driven trigger
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: {
          domain: 'example.com',
          title: 'Documentation',
          referrer: 'https://example.com/',
          id: '/docs',
        },
        context: {},
        globals: {},
        trigger: 'load',
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/docs',
          referrer: 'https://example.com/',
        },
      },
    ],
  ],
};

// Server example (the express source's own): an HTTP POST with a walker event.
export const postEvent: Flow.StepExample = {
  title: 'POST event',
  description:
    'An Express POST to /collect with a JSON body becomes a single walker elb event.',
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    path: '/collect',
    body: {
      name: 'page view',
      data: { title: 'Home', url: 'https://example.com/' },
    },
  },
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: { title: 'Home', url: 'https://example.com/' },
      },
    ],
  ],
};
```

### 3.6 `examples/index.ts` (barrel)

```typescript
export * as env from './env'; // omit if the source has no env.ts
export * as step from './step';
export { createTrigger } from './trigger';
```

### 3.7 `examples/trigger.ts` - `createTrigger`

Every source exports a `createTrigger` following the unified `Trigger.CreateFn`
interface. It simulates real-world invocations from the outside: a real request,
DOM event or SDK call, as a user's platform makes it.

```typescript
import type { Trigger } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

// The source's own shapes (here an HTTP request and its answer)
export interface Content {
  method: string;
  url: string;
}
export interface Result {
  status: number;
}
const isContent = (value: unknown): value is Content =>
  isObject(value) &&
  typeof value.method === 'string' &&
  typeof value.url === 'string';

export const createTrigger: Trigger.CreateFn<unknown, Result> = async (
  config,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<unknown, Result> =
    (type?: string) => async (content) => {
      if (!isContent(content)) throw new Error('content is not a request');
      if (!flow) {
        const result = await startFlow(config);
        flow = { collector: result.collector, elb: result.elb };
      }
      // Package-specific: make a real HTTP request, inject DOM, dispatch an
      // SDK call, and return the Result type this source declares.
      return /* ... */;
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};
```

The server template's [examples/trigger.ts](./examples/trigger.ts) is a complete
one. Reference implementations:

- **Browser:** `packages/web/sources/browser/src/examples/trigger.ts` - DOM
  injection + native event dispatch
- **Session:** `packages/web/sources/session/src/examples/trigger.ts` - no
  env.ts, trigger drives collector directly
- **Express:** `packages/server/sources/express/src/examples/trigger.ts` - real
  HTTP `fetch()` to running server
- **CMP (Usercentrics):**
  `packages/web/sources/cmps/usercentrics/src/examples/trigger.ts` - dispatches
  CMP events, asserts on collector consent state
- **Fetch (function handler):**
  `packages/server/sources/fetch/src/examples/trigger.ts` - accesses source
  instance via `collector.sources`, calls `source.push()` with platform-native
  `Request`
- **AWS Lambda:** `packages/server/sources/aws/src/lambda/examples/trigger.ts` -
  constructs API Gateway event + Lambda context
- **GCP CloudFunction:**
  `packages/server/sources/gcp/src/cloudfunction/examples/trigger.ts` -
  synthesizes mock req/res (matching GCP Functions Framework)

### 3.8 Test Fixture Contract (hard rule)

The examples authored here **are** the Phase 8 test fixtures. No parallel
fixtures allowed.

- `src/__tests__/stepExamples.test.ts` **MUST** iterate examples via
  `it.each(Object.entries(examples.step))`.
- Tests **must NOT** contain hardcoded trigger payloads, HTTP requests, DOM
  HTML, or expected events.
- If a test needs a value that is not in `examples.step`, **add it to `step.ts`
  first**, then consume it from the test.
- Tests invoke `examples.createTrigger(config)` and dispatch each example's
  `trigger.type` + `in` content, asserting the collector receives `out`.

See the canonical source tests
`packages/web/sources/browser/src/__tests__/stepExamples.test.ts` and
`packages/server/sources/express/src/__tests__/stepExamples.test.ts`.

### 3.9 Export via `dev.ts`

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Phase 3 Acceptance Checklist

- [ ] `src/examples/step.ts` - one `Flow.StepExample` per captured trigger /
      input shape, typed `trigger` / `in` / `out`
- [ ] `src/examples/trigger.ts` - exports `createTrigger` typed as
      `Trigger.CreateFn<unknown, Result>`, narrowing its content with a guard
- [ ] `src/examples/index.ts` - barrel exports `step`, `createTrigger`, and
      `env` (when present)
- [ ] `src/examples/env.ts` - included whenever the source touches platform
      globals or injected deps; typed against local `Env`; no real network
- [ ] No standalone `inputs.ts`, `outputs.ts`, `requests.ts`, or `mapping.ts`
      files
- [ ] All platform / SDK types imported from the official package - no `any`, no
      reinvented request / response shapes
- [ ] `src/__tests__/stepExamples.test.ts` iterates `examples.step` via
      `it.each(Object.entries(...))`
- [ ] Tests contain zero hardcoded payloads, requests, or expected events -
      everything flows from `examples.step`
- [ ] Edge cases included (minimal input, invalid input)
- [ ] `npm run build` passes - examples compile against published types
- [ ] Each example traces: `trigger` + `in` → source push → matches `out`

---

## Phase 4: Define Mapping

**Goal:** Document transformation from input format to walkerOS events.

Mapping lives **inside** each `Flow.StepExample` entry in `step.ts` - no
separate `mapping.ts` file. Sources typically carry the mapping either in the
source's own `settings` (see `dataLayer` for an example) or inline via the
`trigger` → `in` → `out` relationship: the `in` content is the raw platform
payload; the `out` lists the events the source pushes after its transformation,
as `['elb', event]` tuples.

### Verify Mapping Logic

For each entry in `step.ts`, trace:

```text
Input: examples.step.pageView.trigger + examples.step.pageView.in
  ↓ createTrigger dispatches the trigger
  ↓ Source receives platform content, runs its transformation
  ↓ Source calls env.push / collector.push
Output: Should match examples.step.pageView.out (['elb', event] tuples)
```

### Gate: Mapping Verified

- [ ] Step examples cover the main input event types
- [ ] Each example name transforms to correct walkerOS event name
- [ ] Each example traces correctly from `(trigger, in)` to `out`

---

## Phase 5: Scaffold

**Template sources:**

- Web: `packages/web/sources/dataLayer/`
- Server: `packages/server/sources/fetch/` (simplest pattern)

```bash
cp -r packages/server/sources/fetch packages/server/sources/[name]
cd packages/server/sources/[name]

# Update package.json: name, description, repository.directory
```

**Directory structure:**

```
packages/server/sources/[name]/
├── src/
│   ├── index.ts           # Main export
│   ├── __tests__/         # stepExamples.test.ts and the other tests
│   ├── dev.ts             # Exports schemas and examples
│   ├── examples/
│   ├── schemas/
│   └── types/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
└── README.md
```

### Transformer Chain Integration

Sources can wire to transformer chains via `next` in the init config:

```typescript
sources: {
  mySource: {
    code: sourceMySource,
    config: { settings: { /* ... */ } },
    next: 'validate'  // Events go through validator before collector
  }
}
```

---

## Phase 6: walkerOS.json Convention

Every walkerOS package ships a `walkerOS.json` file for CDN-based schema
discovery.

### Add `walkerOS` field to package.json

```json
{
  "walkerOS": { "type": "source", "platform": "web" },
  "keywords": ["walkerOS", "walkerOS-source", ...]
}
```

### Use `buildDev()` in tsup.config.ts

Keep `buildDev()` in the `defineConfig` array (the template package's
`tsup.config.ts` has it):

```typescript
import { buildDev } from '@walkeros/config/tsup';
// In defineConfig array:
buildDev(),
```

It builds `src/dev.ts` and writes `dist/walkerOS.json` from the `schemas`,
`examples` and `hints` it exports.

### Hints (Optional)

If your source has capabilities, behaviors, or troubleshooting patterns not
obvious from schemas alone, add hints. See `walkeros-writing-documentation`
skill for full guidelines.

Create `src/hints.ts`:

```typescript
import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'capture-timing': {
    text: 'Describes when events are captured. See settings schema for options.',
    code: [{ lang: 'json', code: '{ "settings": { ... } }' }],
  },
};
```

Export from `src/dev.ts`:

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
export { hints } from './hints';
```

Guidelines:

- Expand awareness - describe capabilities ("supports X, Y, Z"), don't prescribe
  one path
- Reference schemas and examples, don't duplicate them
- Verify every claim against actual implementation before publishing
- Key naming: kebab-case, group with prefixes (auth-\*, capture-\*,
  troubleshoot-\*)
- Most sources don't need hints - schemas and examples cover the common case

### Gate: Convention Met

- [ ] `walkerOS` field in package.json with type and platform
- [ ] `buildDev()` in tsup.config.ts
- [ ] Build generates `dist/walkerOS.json`
- [ ] Keywords include `walkerOS` and `walkerOS-source`

### Runtime-only npm dependencies

A third-party npm dependency that **cannot be ESM-bundled** (uses `__dirname`,
ships a `.node` binary, etc.) needs no declaration: server bundles are traced
with nft, which copies every file the bundle reaches at runtime. Do not add a
`walkerOS.bundle` field to `package.json`: the CLI ignores it and warns
`still declares walkerOS.bundle.<keys>; this is ignored`. See
[walkeros-using-cli: server bundles use nft tracing](../walkeros-using-cli/SKILL.md#server-bundles-use-nft-tracing).

---

## Phase 7: Implement

**Now write code to produce the outputs defined in Phase 3.**

### Template Files

| File                             | Purpose                             | Template                                                       |
| -------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `types/index.ts`                 | Type definitions                    | [types.ts](./templates/server/types.ts)                        |
| `schemas/index.ts`               | Zod settings schema                 | [schemas.ts](./templates/server/schemas.ts)                    |
| `index.ts`                       | Main source                         | [index.ts](./templates/server/index.ts)                        |
| `dev.ts`                         | Dev entry (schemas, examples)       | [dev.ts](./templates/server/dev.ts)                            |
| `examples/`                      | `step.ts`, `trigger.ts`, `index.ts` | [examples/](./examples/) (`step.ts`, `trigger.ts`, `index.ts`) |
| `__tests__/stepExamples.test.ts` | Step example tests                  | [index.test.ts](./templates/server/index.test.ts)              |
| `__tests__/conformance.test.ts`  | Conformance kit (profile `source`)  | [conformance.test.ts](./templates/server/conformance.test.ts)  |

The server template is an HTTP handler that turns a platform's webhook body into
walkerOS events and answers the producer from the push result.

### Key Patterns

1. **Context destructuring**: Extract `config`, `env`, `logger`, `id` from
   context
2. **Settings schema, defaults inline**: the Zod schema in `src/schemas`
   describes the settings for `walkeros validate`, `walkerOS.json` and the docs;
   the source applies its defaults inline and does not parse settings at runtime
   (zod stays out of the runtime bundle)
3. **Forward to collector**: Call `env.push()` to send events to the collector
4. **Platform deps via env**: All platform dependencies (window, document,
   express, cors) must go through `env` with fallback to globals/imports:
   `env.express ?? express`. This enables testing without mocking globals.
5. **Failures are reported, not logged by the source**: a source that cannot
   start throws a `StepError` (`code: 'config'`) from its factory or `init`; it
   never returns early and never returns `false`. Input the collector rejects
   comes back as `invalid` in the push result and is counted as `rejected` by
   the collector. A failure on the source's own side that the push result does
   not carry (for example an `elbLayer` entry that fails) goes through
   `reportCause` from `@walkeros/core` (step `source.<id>`, named by its event,
   never its payload). Use `logger` for `debug` traces of routine operations.
6. **Tell the producer the truth**: an HTTP source builds its answer from the
   push result with `pushResultToOutcome` (or `acknowledge(result)`): `ack`
   answers 200 with the source's success body, `retry` (a retryable failure)
   answers 500, or 207 for the failed events of a batch, `reject` (invalid
   input) answers 400. A failure a resend cannot fix is acknowledged, because
   redelivery would loop. A queue consumer acks on `ack` and `reject` and nacks
   only on `retry`. The body never contains a destination id or a step's error
   text.
7. **Return Source.Instance**: Return `{ type, config, push }` object
8. **Optional `destroy` method**: Implement if the source holds resources (HTTP
   servers, timers, connections) that need cleanup on shutdown

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run verify:touched -- <platform>-source-<name>` passes (L1:
      typecheck + lint + test; the argument is the package name after
      `@walkeros/`)

---

## Adding setup (optional)

A source package can implement an optional `setup()` function to provision
external resources idempotently: Pub/Sub subscriptions, webhook registrations on
upstream platforms, queue declarations, SQS queues, polling cursors, inbound API
keys. Setup runs only when an operator explicitly types
`walkeros setup source.<name>`. The runtime never auto-invokes it from `init()`,
push, or `destroy()`.

The framework provides the slot, the CLI command, and a `resolveSetup` helper.
The package owns: what setup means, idempotency, error handling, return value.

**Today the command cannot run a source's setup.** `walkeros setup` reads the
package's default export as an object with a `setup` method, while a source's
default export is its init function, so `walkeros setup source.<name>` stops
with `Package <name> has no default export`. The SQS source exports its `setup`
from its module (`packages/server/sources/aws/src/sqs/index.ts`), and the
Pub/Sub pull source returns `setup` on the instance its init returns; the
command reaches neither, so provision their resources with the platform's own
tooling (`gcloud`, the AWS CLI, your infrastructure code).

For background on how setup fits the source lifecycle, see
[understanding-sources](../walkeros-understanding-sources/SKILL.md#setup-optional).

### Types

```typescript
// types/index.ts
import type { Elb, Source as CoreSource } from '@walkeros/core';

export interface Settings {
  /* runtime push settings */
}
export interface InitSettings {
  /* one-time init settings */
}
export interface Mapping {
  /* event extraction mapping */
}
export type Push = Elb.Fn; // the source's push signature (an HTTP handler, ...)
export interface Env extends CoreSource.BaseEnv {
  /* injected platform deps (SDK clients, request handlers, etc.) */
}

// The package's own setup options interface.
// Becomes the U slot of Types; surfaces as `config.setup: boolean | Setup` for users.
export interface Setup {
  // package-specific provisioning options
  // e.g. for Pub/Sub source: subscriptionName, ackDeadlineSeconds, filter
  subscriptionName?: string;
  ackDeadlineSeconds?: number;
}

export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings,
  Setup
>;
```

### Implementation

```typescript
// setup.ts
import type { Source as CoreSource, SetupFn } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type { Setup, Types } from './types';

const DEFAULT_SETUP: Setup = {
  ackDeadlineSeconds: 60,
};

export const setup: SetupFn<
  CoreSource.Config<Types>,
  CoreSource.Env<Types>
> = async ({ config, env, logger }) => {
  const options = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!options) return; // config.setup is false or unset

  // Package-specific provisioning, idempotent.
  // Returning a structured object (e.g. { subscriptionCreated: true })
  // makes that data available to operators via `walkeros setup ... | jq`.
};
```

Export it next to the source's init function, as the SQS source's module does:

```typescript
// index.ts
import type { Source as CoreSource } from '@walkeros/core';
import type { Types } from './types';

export { setup } from './setup';

export const sourceMine: CoreSource.Init<Types> = async (context) => ({
  type: 'my-source',
  config: context.config,
  push: context.env.elb,
});

export default sourceMine;
```

### When to implement

Implement `setup()` when your source needs first-time provisioning of upstream
resources before events can be received: Pub/Sub subscriptions bound to a topic,
webhook registrations on upstream SaaS platforms (Stripe, GitHub, Shopify), SQS
queue declarations, message broker bindings, polling cursors. Skip it when your
source only listens on an HTTP port the runtime already owns or intercepts data
already present (DOM events, dataLayer pushes).

### Contract

- Triggered only by `walkeros setup <kind>.<name>`. Never by runtime push, init,
  or destroy.
- **Idempotency is your responsibility.** Re-running setup against a fully
  provisioned environment must be a safe no-op. Use try-create-catch-409 on REST
  APIs, `IF NOT EXISTS` on SQL, native idempotent operations where available.
  The framework does not retry, track state, or detect drift.
- Return structured data from `setup()` when useful for operator scripting. The
  CLI emits non-undefined return values as JSON to stdout.
- For packages where `setup: true` (boolean form) is meaningless because
  mandatory fields have no safe defaults (e.g., GitHub webhook `webhookUrl`,
  Pub/Sub source `topicName`), reject the boolean form with a clear runtime
  error listing required fields:

```typescript
if (config.setup === true) {
  throw new Error(
    'github-webhook source setup requires explicit options: ' +
      '{ webhookUrl, repo, events }. There is no safe default.',
  );
}
```

---

## Phase 8: Test Against Examples

> Tests verify implementation against the examples from Phase 3. If examples are
> incomplete, tests will be incomplete.
>
> See [testing-strategy](../walkeros-testing-strategy/SKILL.md) for the shared
> env / dev-examples conventions this phase depends on.

**Verify implementation produces expected outputs.**

### Test Template

Use the test template: [index.test.ts](./templates/server/index.test.ts), copied
to `src/__tests__/stepExamples.test.ts`. Canonical references:

- `packages/web/sources/browser/src/__tests__/stepExamples.test.ts`
- `packages/server/sources/express/src/__tests__/stepExamples.test.ts`

### Key Test Patterns

1. **`it.each(Object.entries(examples.step))` is mandatory** - one iteration per
   step example. Do not write per-feature tests with hand-rolled payloads.
2. **Drive via `createTrigger`** - construct the trigger with `startFlow`
   config, then dispatch each example's `trigger.type` + `in` content.
3. **A typed context helper** for a test that calls the source factory directly:
   a small function in the test file, as
   `packages/server/sources/express/src/__tests__/index.test.ts` defines
   `createSourceContext`.
4. **Zero hardcoded payloads** - every trigger type, request body, DOM HTML, and
   expected event comes from `examples.step` or `examples.env`. If you need
   something new, add it to examples first.
5. **Test error paths** - verify graceful error handling for invalid input (add
   an error example to `examples.step` if needed), and that a push that fails
   for a retryable reason is answered with a retry, a deterministic one with an
   ack.
6. **Conformance** - run the source with
   `conformance('source', source, options)` from `@walkeros/collector/dev`
   (profile `source`, `createTrigger` for how to feed it); it runs on a real
   collector. A web source may pass `page` from `@walkeros/web-core/dev`; the
   kit requires it only for the browser profiles `web-sdk` and `vendor-global`.

### Gate: Tests Pass

- [ ] `npm run verify:touched -- <platform>-source-<name>` passes (L1)
- [ ] Tests iterate via `it.each(Object.entries(examples.step))`
- [ ] Tests contain no hardcoded payloads, requests, or expected events
- [ ] Every assertion reads from `examples.step[...].out`
- [ ] Invalid input handled gracefully (no crashes)

---

## Phase 9: Document

Follow the [writing-documentation](../walkeros-writing-documentation/SKILL.md)
skill for:

- README structure and templates
- Example validation against `apps/quickstart/`
- Quality checklist before publishing

Key requirements for source documentation:

- [ ] Input format table documenting expected fields
- [ ] Event name mapping table (source format → walkerOS format)
- [ ] Configuration options table
- [ ] Working code example with imports
- [ ] Installation instructions

---

## Validation Checklist

Beyond
[understanding-development](../walkeros-understanding-development/SKILL.md)
requirements (build, test, lint, no `any`):

- [ ] `dev.ts` exports `schemas` (with `settings`; `z.object({})` when the step
      has none) and `examples`
- [ ] Multi-export package (two or more `walkerOS.exports`): `exportExamples`
      and `exportSchemas` in `dev.ts` list exactly those exports, the default
      included, and every `exportSchemas` entry has `settings`; the build fails
      otherwise (see
      [using-step-examples](../walkeros-using-step-examples/SKILL.md))
- [ ] Examples include edge cases (minimal, invalid input)
- [ ] Invalid input returns gracefully (no crashes, clear error)
- [ ] Tests use examples for assertions (not hardcoded values)
- [ ] `walkerOS.json` generated at build time
- [ ] `walkerOS` field in package.json

---

## Reference Files

| What            | Where                                 |
| --------------- | ------------------------------------- |
| Web template    | `packages/web/sources/dataLayer/`     |
| Server template | `packages/server/sources/fetch/`      |
| Source types    | `packages/core/src/types/source.ts`   |
| Test events     | `packages/core/src/eventGenerator.ts` |

## Related Skills

- [understanding-sources](../walkeros-understanding-sources/SKILL.md) - Source
  interface and push pattern
- [understanding-events](../walkeros-understanding-events/SKILL.md) - Event
  structure
- [using-step-examples](../walkeros-using-step-examples/SKILL.md) -
  Authoritative `Flow.StepExample` + `createTrigger` pattern, Three Type Zones
- [testing-strategy](../walkeros-testing-strategy/SKILL.md) - Testing with env
  mocking and dev-examples-as-fixtures conventions
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards

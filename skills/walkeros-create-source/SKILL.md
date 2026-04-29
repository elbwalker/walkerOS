---
name: walkeros-create-source
description:
  Use when creating a new walkerOS source. Example-driven workflow starting with
  research and examples before implementation.
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
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards (for Phase 9)

## Source Types

A source's identity is split into two fields:

| Field             | Meaning                                                         | Examples                                       |
| ----------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| `source.type`     | The kind of source (its role / mechanism)                       | `browser`, `dataLayer`, `cookiefirst`, `fetch` |
| `source.platform` | The runtime that hosts the source (`web`, `server`, `app`, ...) | `web`, `server`                                |

| Platform | Input                   | Example types                       |
| -------- | ----------------------- | ----------------------------------- |
| `web`    | DOM events, dataLayer   | `browser`, `dataLayer`              |
| `server` | HTTP requests, webhooks | `gcp`, `express`, `lambda`, `fetch` |

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

All reference sources in the monorepo use this exact layout in `src/examples/`.
Match it - no `inputs.ts`, `outputs.ts`, `requests.ts`, or standalone
`mapping.ts`.

| File                  | Required? | Purpose                                                             |
| --------------------- | --------- | ------------------------------------------------------------------- |
| `examples/step.ts`    | yes       | `Flow.StepExample` entries with `trigger` / `in` / `out` triples    |
| `examples/trigger.ts` | yes       | `createTrigger` implementation following `Trigger.CreateFn`         |
| `examples/index.ts`   | yes       | Barrel exports: `env` (if present), `step`, `createTrigger`         |
| `examples/env.ts`     | if needed | Mock env for platform deps (browser window/document, express, etc.) |

`env.ts` is included whenever the source touches platform globals or injected
deps - all web sources and every server source that wraps a platform SDK ship
one. Sources whose tests drive the collector entirely through `trigger.ts` (e.g.
`web/sources/session`) may omit it. When in doubt, **include it**.

The old `inputs.ts` / `outputs.ts` / `requests.ts` / `mapping.ts` files are gone

- their contents now live inline in each `Flow.StepExample` entry in `step.ts`.

### 3.3 Three Type Zones for Sources

Sources are the **inverse** of destinations in the Three Type Zones model:

| Zone      | Source semantics                                                                      |
| --------- | ------------------------------------------------------------------------------------- |
| `trigger` | How to simulate the invocation (HTTP method, DOM event type, cloud event)             |
| `in`      | External trigger content - HTTP request, DOM HTML, SDK payload (NOT a walkerOS event) |
| `out`     | The walkerOS event(s) the source should emit (`WalkerOS.Event`)                       |

Where a destination does `WalkerOS.Event → vendor output`, a source does
`external content → WalkerOS.Event`. Read
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
- **`out`** uses `WalkerOS.Event` (or `DeepPartialEvent` for fragments).
- **Step entries** are typed `Flow.StepExample` from `@walkeros/core`.
- **Mock env** is typed against the source's local `Env` type from `../types`.
- `createTrigger` is typed as `Trigger.CreateFn<Content, Result>` - the
  `Content` and `Result` generics come from the source's own types module.

### 3.5 Code Template - `examples/step.ts`

```typescript
import type { Flow } from '@walkeros/core';

// One step example per captured trigger / input shape.
// `trigger` tells createTrigger how to simulate the invocation.
// `in` is the platform-specific content (HTTP request, DOM HTML, SDK payload) -
//      typed against the platform SDK's published types where available.
// `out` is the walkerOS event the source is expected to emit.

// Set `title` + `description` for public examples; mark test-only fixtures
// with `public: false`. See
// [walkeros-using-step-examples](../walkeros-using-step-examples/SKILL.md).

export const pageView: Flow.StepExample = {
  trigger: {
    type: 'load',
    options: {
      url: 'https://example.com/docs',
      title: 'Documentation',
    },
  },
  in: '', // no external content - DOM-driven trigger
  out: {
    name: 'page view',
    data: { domain: 'example.com', title: 'Documentation', id: '/docs' },
    entity: 'page',
    action: 'view',
    trigger: 'load',
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/docs',
    },
  },
};

// Server example: HTTP POST carrying a walker event payload.
export const orderComplete: Flow.StepExample = {
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    path: '/collect',
    body: { name: 'order complete', data: { id: 'ORD-123', total: 149.97 } },
  },
  out: {
    name: 'order complete',
    data: { id: 'ORD-123', total: 149.97 },
    entity: 'order',
    action: 'complete',
  },
};
```

### 3.6 `examples/index.ts` (barrel)

```typescript
export * as env from './env'; // omit if the source has no env.ts
export * as step from './step';
export { createTrigger, trigger } from './trigger';
```

### 3.7 `examples/trigger.ts` - `createTrigger`

Every source exports a `createTrigger` following the unified
`Trigger.CreateFn<Content, Result>` interface. It simulates real-world
invocations from the outside - no source instance access, full blackbox.

```typescript
import type { Trigger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

export const createTrigger: Trigger.CreateFn<Content, Result> = async (
  config,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<Content, Result> =
    (type?: string) => async (content) => {
      if (!flow) {
        const result = await startFlow(config);
        flow = { collector: result.collector, elb: result.elb };
      }
      // Package-specific: make real HTTP request, inject DOM, dispatch SDK call.
      // Return the Result type declared by this source.
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

Reference implementations:

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

- `src/index.test.ts` **MUST** iterate examples via
  `it.each(Object.entries(examples.step))`.
- Tests **must NOT** contain hardcoded trigger payloads, HTTP requests, DOM
  HTML, or expected events.
- If a test needs a value that is not in `examples.step`, **add it to `step.ts`
  first**, then consume it from the test.
- Tests invoke `examples.createTrigger(config)` and dispatch each example's
  `trigger.type` + `in` content, asserting the collector receives `out`.

See the canonical source tests under
`packages/web/sources/browser/src/index.test.ts` and
`packages/server/sources/express/src/index.test.ts`.

### 3.9 Export via `dev.ts`

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Phase 3 Acceptance Checklist

- [ ] `src/examples/step.ts` - one `Flow.StepExample` per captured trigger /
      input shape, typed `trigger` / `in` / `out`
- [ ] `src/examples/trigger.ts` - exports `createTrigger` typed as
      `Trigger.CreateFn<Content, Result>`
- [ ] `src/examples/index.ts` - barrel exports `step`, `createTrigger`, and
      `env` (when present)
- [ ] `src/examples/env.ts` - included whenever the source touches platform
      globals or injected deps; typed against local `Env`; no real network
- [ ] No standalone `inputs.ts`, `outputs.ts`, `requests.ts`, or `mapping.ts`
      files
- [ ] All platform / SDK types imported from the official package - no `any`, no
      reinvented request / response shapes
- [ ] `src/index.test.ts` iterates `examples.step` via
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
payload; the `out` is the walkerOS event after the source's transformation.

### Verify Mapping Logic

For each entry in `step.ts`, trace:

```text
Input: examples.step.pageView.trigger + examples.step.pageView.in
  ↓ createTrigger dispatches the trigger
  ↓ Source receives platform content, runs its transformation
  ↓ Source calls env.push / collector.push
Output: Should match examples.step.pageView.out (a WalkerOS.Event)
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
│   ├── index.test.ts      # Tests against examples
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

Replace `buildModules({ entry: ['src/dev.ts'] })` with `buildDev()`:

```typescript
import { buildDev } from '@walkeros/config/tsup';
// In defineConfig array:
buildDev(),
```

This auto-generates `dist/walkerOS.json` from your Zod schemas at build time.

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

---

## Phase 7: Implement

**Now write code to produce the outputs defined in Phase 3.**

### Template Files

| File               | Purpose                | Template                                    |
| ------------------ | ---------------------- | ------------------------------------------- |
| `types/index.ts`   | Type definitions       | [types.ts](./templates/server/types.ts)     |
| `schemas/index.ts` | Zod validation schemas | [schemas.ts](./templates/server/schemas.ts) |
| `index.ts`         | Main source            | [index.ts](./templates/server/index.ts)     |

### Key Patterns

1. **Context destructuring**: Extract `config`, `env`, `logger`, `id` from
   context
2. **Schema validation**: Use Zod schemas to validate settings and provide
   defaults
3. **Forward to collector**: Call `env.push()` to send events to the collector
4. **Platform deps via env**: All platform dependencies (window, document,
   express, cors) must go through `env` with fallback to globals/imports:
   `env.express ?? express`. This enables testing without mocking globals.
5. **Error logging**: Use `logger?.error()` for errors only, not routine
   operations
6. **Return Source.Instance**: Return `{ type, config, push }` object
7. **Optional `destroy` method**: Implement if the source holds resources (HTTP
   servers, timers, connections) that need cleanup on shutdown

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run verify:touched -- <source-name>` passes (L1: typecheck + lint +
      test)

---

## Phase 8: Test Against Examples

> Tests verify implementation against the examples from Phase 3. If examples are
> incomplete, tests will be incomplete.
>
> See [testing-strategy](../walkeros-testing-strategy/SKILL.md) for the shared
> env / dev-examples conventions this phase depends on.

**Verify implementation produces expected outputs.**

### Test Template

Use the test template: [index.test.ts](./templates/server/index.test.ts).
Canonical references:

- `packages/web/sources/browser/src/index.test.ts`
- `packages/server/sources/express/src/index.test.ts`

### Key Test Patterns

1. **`it.each(Object.entries(examples.step))` is mandatory** - one iteration per
   step example. Do not write per-feature tests with hand-rolled payloads.
2. **Drive via `createTrigger`** - construct the trigger with `startFlow`
   config, then dispatch each example's `trigger.type` + `in` content.
3. **Use `createSourceContext()` helper** for any direct context construction.
4. **Zero hardcoded payloads** - every trigger type, request body, DOM HTML, and
   expected event comes from `examples.step` or `examples.env`. If you need
   something new, add it to examples first.
5. **Test error paths** - verify graceful error handling and logging for invalid
   input (add an error example to `examples.step` if needed).

### Gate: Tests Pass

- [ ] `npm run verify:touched -- <source-name>` passes (L1)
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

- [ ] `dev.ts` exports `schemas` and `examples`
- [ ] Examples include edge cases (minimal, invalid input)
- [ ] Invalid input returns gracefully (no crashes, clear error)
- [ ] Tests use examples for assertions (not hardcoded values)
- [ ] `walkerOS.json` generated at build time
- [ ] `walkerOS` field in package.json

---

## Reference Files

| What            | Where                               |
| --------------- | ----------------------------------- |
| Web template    | `packages/web/sources/dataLayer/`   |
| Server template | `packages/server/sources/fetch/`    |
| Source types    | `packages/core/src/types/source.ts` |
| Event creation  | `packages/core/src/lib/event.ts`    |

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

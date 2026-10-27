---
name: walkeros-create-destination
description: >-
  Use when creating a new walkerOS destination to send events to a vendor or API
  (GA4/gtag, Meta/Facebook Pixel, Mixpanel, Amplitude, a custom HTTP API,
  Measurement Protocol), web or server-side. Example-driven workflow: research
  the vendor SDK and define step examples before implementing the destination
  interface, env pattern, and mappings.
---

# Create a New Destination

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../walkeros-understanding-flow/SKILL.md) - How
  destinations fit in architecture
- [understanding-destinations](../walkeros-understanding-destinations/SKILL.md) -
  Destination interface
- [understanding-transformers](../walkeros-understanding-transformers/SKILL.md) -
  Transformer chaining to destinations
- [understanding-mapping](../walkeros-understanding-mapping/SKILL.md) - Event
  transformation
- [testing-strategy](../walkeros-testing-strategy/SKILL.md) - How to test with
  env pattern (Phase 3 + Phase 8)
- [using-step-examples](../walkeros-using-step-examples/SKILL.md) -
  Authoritative pattern for `Flow.StepExample` structure and Three Type Zones
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards (for Phase 9)

## Choose Your Template

| Complexity | Template     | When to Use                         |
| ---------- | ------------ | ----------------------------------- |
| Simple     | `plausible/` | Single SDK call, minimal config     |
| Complex    | `gtag/`      | Multiple services, sub-destinations |
| Server     | `gcp/`       | Server-side, batching, SDK init     |

## Process Overview

```
1. Research     → Deeply understand vendor SDK, API, and event taxonomy
2. Classify     → Determine vendor taxonomy type and integration approach
3. Examples     → Define in/out pairs FIRST (start with the end result)
4. Mapping      → Define walkerOS → vendor transformation
5. Scaffold     → Copy template and configure
6. Convention   → Add walkerOS.json metadata and buildDev
7. Implement    → Build using examples as test fixtures
8. Test         → Verify against example variations
9. Document     → Write README
```

---

## Phase 1: Research

**Goal:** Deeply understand the vendor SDK before writing any code. Research
quality determines implementation quality.

### 1.1 Find and Install Official SDK

Always prefer the vendor's official SDK package over raw HTTP API calls. The SDK
handles transport, batching, retries, and plugin ecosystems; don't reinvent
these.

- [ ] **Install the SDK**: `npm install @vendor/sdk` and read the actual source
- [ ] **Read TypeScript types**: Import types from the SDK package directly.
      Never duplicate type definitions. This ensures IntelliSense completeness
      and consistency with SDK updates.
- [ ] **Understand the full API surface**: List every public method, not just
      `track()`. Identity methods, property operations, group management,
      specialized event types (revenue, etc.)

```bash
# Search npm for official packages
npm search [vendor-name]
npm search @[vendor]

# Install and inspect actual types
npm install @vendor/analytics-browser
ls node_modules/@vendor/analytics-browser/lib/esm/
```

### 1.2 Understand SDK Architecture

- [ ] **Init options**: What does `init()` accept? What can be configured?
- [ ] **Call ordering**: Can you call methods before `init()`? Is there internal
      queuing? What are the race condition implications?
- [ ] **Plugin system**: Does the SDK support plugins? How are they added?
- [ ] **Identity management**: How does the SDK handle user/device/session IDs?
      Does it manage cookies/storage? Can this be disabled (since walkerOS
      manages identity)?
- [ ] **Consent**: Does the SDK have a consent mode or just binary opt-out?

### 1.3 Identify All Event Methods

Go beyond just `track()`. Most SDKs have specialized methods:

| Method Category  | Examples                            | walkerOS Handling   |
| ---------------- | ----------------------------------- | ------------------- |
| Event tracking   | `track()`, `logEvent()`             | Default `push()`    |
| User properties  | `identify()`, `setUserProperties()` | `mapping.settings`  |
| Revenue/purchase | `revenue()`, `purchase()`           | `mapping.settings`  |
| Groups/accounts  | `setGroup()`, `groupIdentify()`     | `mapping.settings`  |
| Identity setters | `setUserId()`, `setDeviceId()`      | `settings.identify` |
| Opt-out          | `setOptOut()`, `consent()`          | `on('consent')`     |
| Cleanup          | `flush()`, `reset()`                | `destroy()`         |

### 1.4 Check Existing Patterns

Review similar destinations in the codebase:

```bash
ls packages/web/destinations/
```

### Gate: Research Complete

- [ ] Official SDK installed and types inspected
- [ ] All public methods listed with their purpose
- [ ] Init options understood (what to disable, what to pass through)
- [ ] Call ordering / race conditions understood
- [ ] Identity, consent, and plugin patterns documented

### Checkpoint: Research Review (Optional)

If working with human oversight, pause here to confirm:

- SDK integration approach correct?
- Event mapping makes sense for the use case?
- Any vendor quirks or limitations to handle?

---

## Phase 2: Classify Vendor Taxonomy

**Goal:** Understand what the vendor expects, which determines destination
complexity.

### 2.1 Taxonomy Types

| Type             | Description                                    | Mapping Needed                        | Example Vendors       |
| ---------------- | ---------------------------------------------- | ------------------------------------- | --------------------- |
| **Free-form**    | Any event name accepted, no prescribed schema  | Minimal: names pass through           | Most modern analytics |
| **Rigid**        | Prescribed event names unlock specific reports | Essential: must map to exact names    | Some legacy analytics |
| **Schema-based** | Self-describing events with formal schemas     | Structural: must build schema objects | Data warehouse tools  |

### 2.2 Determine Integration Approach

| Approach                   | When to use                        | Pattern                                                    |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| **Vendor SDK as host**     | SDK has plugins, batching, retries | Load SDK, disable what walkerOS replaces, use as transport |
| **Script + command queue** | SDK loaded via script tag          | Load script, use global function queue                     |
| **HTTP API**               | No SDK available, or server-side   | Direct HTTP calls via `sendWeb()` or `fetch`               |

**Prefer the vendor SDK**: it handles transport, retries, and plugin
orchestration. HTTP API is a fallback when no SDK exists.

When using the vendor SDK:

- Disable features walkerOS replaces (autocapture, identity storage) **by
  default**, but allow users to re-enable via settings
- Pass through all SDK init options for full configurability
- Import types from the SDK package directly

### Gate: Classification Complete

- [ ] Taxonomy type identified (free-form / rigid / schema-based)
- [ ] Integration approach chosen (SDK / script / HTTP)
- [ ] Know which SDK features walkerOS replaces vs. uses

---

## Phase 3: Create Examples (BEFORE Implementation)

**Mandatory.** Examples are the test fixtures for Phase 8. Define expected `in`
/ `out` / `mapping` triples FIRST: start with the end result in mind. Without
examples, you cannot test. Even for free-form vendors where no mapping is
strictly "required," step examples serve as the single source of truth for
tests, simulations, and documentation.

> **Authoritative pattern:** See
> [using-step-examples](../walkeros-using-step-examples/SKILL.md) for the Three
> Type Zones and lifecycle. This skill reuses that contract; do not diverge.

### 3.1 Scaffold Directory Structure

```bash
mkdir -p packages/web/destinations/[name]/src/examples
mkdir -p packages/web/destinations/[name]/src/{schemas,types}
```

### 3.2 Required Files (4 files total)

The reference web destinations (meta, snowplow, plausible, piwikpro, api) use
exactly four files in `src/examples/`. Match this structure: no `events.ts`,
`outputs.ts`, or standalone `mapping.ts`.

| File                  | Purpose                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `examples/env.ts`     | Mock environment for testing (no real network calls)              |
| `examples/step.ts`    | `Flow.StepExample` entries with `in` / `out` / `mapping?` triples |
| `examples/minimal.ts` | `Flow.MinimalExample`: only the settings it needs to start        |
| `examples/index.ts`   | Barrel exports: `env`, `step` and `minimal`                       |

The `step.ts` file embeds the input event, the mapping config, and the expected
vendor output together in one `Flow.StepExample`.

The skill's [examples/](./examples/) folder holds these four files for the
template destination ([templates/simple/](./templates/simple/)): copy them to
`src/examples/` (its `events.ts`, `outputs.ts` and `mapping.ts` are not part of
this layout; do not copy them).

### 3.3 Typing Rules (strict)

**No `any`.** Every example value must be explicitly typed.

- **Inputs** use `WalkerOS.Event` (via `getEvent()` from `@walkeros/core`);
  never hand-roll event literals.
- **Outputs** use **vendor SDK types** imported from the official package
  whenever the vendor publishes them. Do not invent local output types for
  payloads the vendor already types (e.g. use Meta Pixel's `fbq` argument types,
  not a local `FbqCall` interface).
- **Step entries** are typed `Flow.StepExample` from `@walkeros/core`.
- **Mock env** is typed against the destination's local `Env` type from
  `../types`. No `as any`, no untyped `{}`.
- Vendor SDK types come from the SDK you installed in Phase 1: reuse them rather
  than duplicating shapes.

### 3.4 Code Template: `examples/step.ts`

The examples match the template destination
([index.ts](./templates/simple/index.ts)), which calls a vendor global
`window.vendorSdk('track', name, params)`:

```typescript
import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

// One step example per supported feature / setting.
// `in`  is a WalkerOS.Event (getEvent returns the same event on every run).
// `out` lists the vendor calls the destination makes, as [callable, ...args]
//       tuples written from the vendor's documented calls.
// `mapping` is the mapping rule under test (optional: omit it for the default
//       push).

// Set `title` + `description` for public examples; mark test-only fixtures
// with `public: false`. See the walkeros-using-step-examples skill.

export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'The destination loads the vendor script and initializes the SDK with the API key.',
  in: { loadScript: true, settings: { apiKey: 'YOUR_API_KEY' } },
  out: [['window.vendorSdk', 'init', 'YOUR_API_KEY']],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is sent as a purchase with its id, value and currency.',
  in: getEvent('order complete'),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        transaction_id: 'data.id',
        value: 'data.value',
        currency: { key: 'data.currency', value: 'EUR' },
      },
    },
  },
  out: [
    [
      'window.vendorSdk',
      'track',
      'purchase',
      { transaction_id: '0rd3r1d', value: 462, currency: 'EUR' },
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description: 'A page view without a rule is sent under its walkerOS name.',
  in: getEvent('page view'),
  out: [['window.vendorSdk', 'track', 'page view', {}]],
};
```

A consent example sets `command: 'consent'`, which routes `in` through
`elb('walker consent', in)` instead of an event push (see `consentRevoke`
below).

#### Init step example

A destination whose `init` makes vendor calls (script tags, SDK initializers,
queue setup) can ship them as an `examples.step.init` entry, as plausible, meta
and snowplow do.

- `in` mirrors the real `Destination.Config` shape users copy-paste, typically
  `{ loadScript: true, settings: { /* vendor-specific */ } }`. Whatever a user
  would configure in their flow goes here verbatim.
- `out` is the ordered list of vendor calls the `init()` lifecycle produces.
  Each effect tuple follows the standard `[callable, ...args]` shape.

`runExamples` keeps init calls out of every event example's `out` and takes
events only, so the init example runs in a test of its own: start a real
collector, call `destination.init(...)` with an env that records the paths
`examples.env.simulation` names, and compare the calls with `init.out`. The
template [index.test.ts](./templates/simple/index.test.ts) does this, as
`packages/web/destinations/meta/src/__tests__/conformance.test.ts` does.

**Multi-tool packages** (like `gtag`, which drives GA4, Google Ads, and GTM)
ship **per-tool init examples** (`examples.step.ga4Init`, `adsInit`, `gtmInit`)
instead of a single `init`, and their tests run each with its sub-tool's
settings.

#### Failure, silent and consent examples

Besides the happy path, `step.ts` carries `public: false` examples that the
conformance kit and `runExamples` (Phase 8) run on a real collector. The first
and the last fit the template destination; the two in between show failures
other destinations report:

```typescript
// A silent rule sends nothing.
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no event.',
  in: getEvent('page view'),
  mapping: { silent: true },
  out: [],
};

// A destination that needs a user id reports an event without one.
export const missingInput: Flow.StepExample = {
  public: false,
  description: 'Without a user id the push fails with missing-input.',
  in: getEvent('page view', { user: { device: 'c00k13' } }),
  mapping: { settings: { identify: { map: { id: 'user.id' } } } },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

// An HTTP destination whose vendor answers 200 with an error in the body.
export const rejectedByVendor: Flow.StepExample = {
  public: false,
  description: 'The vendor answers 200 and reports the event as failed.',
  in: getEvent('page view'),
  respond: { status: 200, body: { events: [{ status: 'failed' }] } },
  outcome: { status: 'failed', code: 'transport', retryable: false },
};

// A consent revocation reaches the vendor.
export const consentRevoke: Flow.StepExample = {
  public: false,
  description:
    'For a destination with config.consent { marketing: true }, revoking marketing tells the vendor to revoke.',
  command: 'consent',
  in: { marketing: false },
  out: [['window.vendorSdk', 'consent', 'revoke']],
};
```

`outcome` is `{ status: 'failed' | 'queued', code, retryable? }`; `respond` is
what the vendor's boundary answers (`status`, `body`, or
`error: 'network' | 'timeout'`). An example that expects no vendor call has
`out: []`. A "one of these settings" rule (`ga4`, `ads` or `gtm`) is stated as
`anyOf` in the settings schema, not only in `init`.

For destinations, the Three Type Zones collapse to:

- `in` = walkerOS event (`WalkerOS.Event`)
- `out` = vendor output (typed against vendor SDK)
- `mapping` = rule under test (optional)

### 3.5 `examples/index.ts` (barrel)

```typescript
export * as env from './env';
export * as step from './step';
export { minimal } from './minimal';
```

### 3.6 `examples/env.ts`

Mock the vendor SDK surface and any DOM touchpoints. Never reach real network,
real cookies, or real globals. Type the exports against your local `Env`, and
name the calls a simulation records in `simulation`:

```typescript
import { mockScriptDocument } from '@walkeros/web-core/dev';
import type { Env } from '../types';

const noop = () => {};

/** Before init: no SDK global yet, `init` installs the stub. */
export const init: Env = {
  window: {},
  document: mockScriptDocument(),
};

/** After init: the SDK global the push calls. */
export const push: Env = {
  window: { vendorSdk: Object.assign(noop, { q: [] as IArguments[] }) },
  document: mockScriptDocument(),
};

/** The calls a simulation records. */
export const simulation = ['call:window.vendorSdk'];
```

### 3.7 `examples/minimal.ts`

The minimal example is the setup a reader copies: the docs page renders its
install line, integrated code and `flow.json` under `## Installation` from it
(`<Quickstart data={data} />`), and the conformance test runs exactly those
settings and requires one public example delivered.

```typescript
import type { Flow } from '@walkeros/core';

/** The settings the vendor needs to deliver: the API key, with the vendor script loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'YOUR_API_KEY' },
  config: { loadScript: true },
};
```

- `settings`: only the keys the settings schema requires, plus any that `init`
  refuses to start without under the example's `config` (Plausible's `domain`
  with `loadScript: true`), with placeholder values. Other keys stay in the step
  examples that need them; the kit fails a minimal example that sets one.
- `config`: only `{ loadScript: true }`, for a web destination that loads its
  vendor script only when asked to; the kit fails a script-loaded destination
  without it.
- `secrets` (server destinations): each credential setting mapped to its secret
  name, `<VENDOR>_<SETTING>` (for example
  `{ accessToken: 'META_ACCESS_TOKEN' }`). The generated code reads
  `process.env.META_ACCESS_TOKEN` and `$secret.META_ACCESS_TOKEN`; a web
  destination holds no secret.
- A package with several exports keeps one per export, in the export's folder
  (`src/firehose/examples/minimal.ts`), listed in `exportExamples`.

A package that cannot express its setup in one minimal example (one package
serving several docs pages, an install line with a driver choice) passes
`withoutMinimal: '<reason>'` to `conformance` instead, and its page keeps a
hand-written setup.

### 3.8 Test Fixture Contract (hard rule)

The examples authored here **are** the Phase 8 test fixtures. No parallel
fixtures allowed.

- Every event example runs through `runExamples` from `@walkeros/collector/dev`
  with `claims` (the standard events the destination maps): it runs each one on
  a real collector as `walkerOS.json` publishes it and compares its `out` and
  its `outcome`. Do not hand-roll that loop.
- Tests **must NOT** contain hardcoded payloads, vendor configs, or expected
  outputs.
- If a test needs a value that is not in `examples.step`, **add it to `step.ts`
  first**, then consume it from the test. Never inline test data.
- The only per-test setup allowed is the settings a group of examples needs
  (e.g. enabling the right sub-tool).

See `packages/web/destinations/meta/src/__tests__/conformance.test.ts` for a
canonical reference.

### 3.9 Export via `dev.ts`

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Phase 3 Acceptance Checklist

- [ ] `src/examples/env.ts`: mock env, no real network, typed against local
      `Env`
- [ ] `src/examples/step.ts`: one `Flow.StepExample` per supported feature /
      setting, typed `in` / `out` / `mapping?`
- [ ] `src/examples/minimal.ts`: `Flow.MinimalExample` with only the settings
      the schema requires or `init` refuses to start without (`secrets` for
      server credentials, `config.loadScript` for a script-loaded web
      destination)
- [ ] `src/examples/index.ts`: barrel exports `env`, `step` and `minimal`
- [ ] No standalone `events.ts`, `outputs.ts`, or `mapping.ts` files
- [ ] All vendor SDK types imported from the official package, no `any`, no
      reinvented local output types
- [ ] `src/__tests__/conformance.test.ts` runs the event examples through
      `runExamples` with `claims`, and a test runs the init example (if any)
- [ ] Tests contain zero hardcoded payloads / vendor configs / expected outputs:
      everything flows from `examples.step`
- [ ] `npm run build` passes: examples compile against published types
- [ ] Each example traces: `in` → apply `mapping` → matches `out`

---

## Phase 4: Define Mapping

**Goal:** Document transformation from walkerOS events to vendor format.

Mapping rules live **inside** each `Flow.StepExample` entry in `step.ts`, no
separate `mapping.ts` file. Each step example embeds the exact mapping rule
under test alongside its `in` event and expected `out` output.

### Verify Mapping Logic

For each entry in `step.ts`, trace:

```
Input: examples.step.purchase.in     (WalkerOS.Event)
  ↓ Apply examples.step.purchase.mapping
  ↓ name transforms, data.map applied
Output: Should match examples.step.purchase.out
```

### Gate: Mapping Verified

- [ ] Step examples cover: page view + at least one conversion event
- [ ] One step example per supported setting / sub-tool
- [ ] Each `mapping` traces correctly from `in` to `out`

---

## Phase 5: Scaffold

**Template destination:** `packages/web/destinations/plausible/`

```bash
cp -r packages/web/destinations/plausible packages/web/destinations/[name]
cd packages/web/destinations/[name]

# Update package.json: name, description, repository.directory
```

**Directory structure:**

```
packages/web/destinations/[name]/
├── src/
│   ├── index.ts           # Main destination (init + push)
│   ├── index.test.ts      # The init example and other boundary tests
│   ├── __tests__/         # conformance.test.ts: conformance + runExamples
│   ├── dev.ts             # Exports schemas and examples
│   ├── examples/          # env.ts, step.ts, minimal.ts, index.ts
│   ├── schemas/
│   └── types/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
└── README.md
```

### Transformer Chain Integration

Destinations can wire to transformer chains via `before` in the init config:

```typescript
destinations: {
  myDestination: {
    code: destinationMyDestination,
    config: { settings: { /* ... */ } },
    before: 'redact'  // Events go through redactor before this destination
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
  "walkerOS": { "type": "destination", "platform": "web" },
  "keywords": ["walkerOS", "walkerOS-destination", ...]
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

If your destination has capabilities, behaviors, or troubleshooting patterns not
obvious from schemas alone, add hints. See `walkeros-writing-documentation`
skill for full guidelines.

Create `src/hints.ts`:

```typescript
import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'auth-methods': {
    text: 'Supports X, Y, and Z auth methods. See settings schema for all options.',
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

- Expand awareness: describe capabilities ("supports X, Y, Z"), don't prescribe
  one path
- Reference schemas and examples, don't duplicate them
- Verify every claim against actual implementation before publishing
- Key naming: kebab-case, group with prefixes (auth-\*, storage-\*,
  troubleshoot-\*)
- Most destinations don't need hints; schemas and examples cover the common case

### Gate: Convention Met

- [ ] `walkerOS` field in package.json with type and platform
- [ ] `buildDev()` in tsup.config.ts
- [ ] Build generates `dist/walkerOS.json`
- [ ] Keywords include `walkerOS` and `walkerOS-destination`

---

## Phase 7: Implement

**Now write code to produce the outputs defined in Phase 3.**

### Template Files

Use these templates as your starting point:

| File                            | Purpose                        | Template                                                      |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `types/index.ts`                | Type definitions               | [types.ts](./templates/simple/types.ts)                       |
| `index.ts`                      | Main destination               | [index.ts](./templates/simple/index.ts)                       |
| `index.test.ts`                 | Init example test              | [index.test.ts](./templates/simple/index.test.ts)             |
| `__tests__/conformance.test.ts` | Failure contract, all examples | [conformance.test.ts](./templates/simple/conformance.test.ts) |

### Key Patterns

1. **Init receives context**: Destructure `config`, `env`, `logger`, `id` from
   context
2. **Push receives context**: Includes `data` (the mapped data), `rule` (the
   matching mapping rule), `ingest`
3. **Use `getEnv<Env>(env)`**: Never access `window`/`document` directly, and
   never cast them. Declare your SDK global
   (`declare global { interface Window { vendorSdk?: ... } }`) and narrow
   `Env['window']` to the SDK shape in `types.ts`. The generic
   `getEnv<Env>(env)` then returns your narrowed env intersected with the real
   DOM globals, so `window.vendorSdk` and `document.createElement` are fully
   typed with zero casts. No `as any`, `as unknown`, `as Window`, `as Document`,
   `@ts-ignore`, or `@ts-expect-error` is allowed in production **or** test
   code, ever. If something will not type check, fix the types, do not cast.
4. **Return config from init**: Allows updating config during initialization
5. **Optional `destroy` method**: Implement if the destination holds resources
   (DB connections, SDK clients, timers) that need cleanup on shutdown. Call
   `flush()` or equivalent on the vendor SDK.
6. **Mapping-based settings** (recommended): Use standard walkerOS mapping
   values (`map`, `loop`, `key`, `value`, `condition`) in `mapping.settings.*`
   for vendor-specific operations. Resolve via
   `getMappingValue(event, value, { collector })` in `push()`, with the
   `collector` from the push context, and interpret the resolved object's keys
   as SDK method instructions. This keeps config agnostic and reuses the mapping
   engine.
7. **Consent two-layer**: `config.consent` gates walkerOS event delivery.
   `on('consent')` controls vendor SDK internals (opt-out, pause capture, etc.).
   Both needed for complete consent compliance. `on()` may be async: the
   collector awaits it, bounded by `config.timeout`, and delivers the current
   state before the destination's first push; events pushed meanwhile answer
   `queued` with the reason `held`. A state handler that rejects or does not
   settle in that time writes an ERROR line (`consent not applied`) and holds
   the destination's events for one more `config.timeout`. The first push after
   that window retries the delivery, and once a delivery succeeds the held
   events are delivered. Until one has succeeded, the held events and every
   later one fail with `blocked` (the push answers `ok: false`, the events go to
   the dead-letter queue, an ERROR `Push failed` line is written) and are not
   sent when the destination recovers; later pushes retry the delivery once per
   `config.timeout`. A `walker run` discards events that are still held, with no
   counter and no log line. Lifecycle handlers such as `on('run')` are awaited
   too, bounded by the same timeout, and never hold events. `elb` commands and
   `startFlow` resolve only after the destinations' `on()` handlers for that
   command have settled or timed out. See
   [consent](https://www.walkeros.io/docs/guides/consent#gate-a-destination-with-consent)
   for the full sequence.
   - For step-example tests, use `command: 'consent'` on `Flow.StepExample` to
     invoke the `on('consent')` handler. Do not push consent data as an event.

8. **A failure is a throw** (the failure contract). A `push` or `init` that
   returns normally counts as delivered, so:
   - Throw a `StepError` from `@walkeros/core` with a `code` (`config` for a
     missing or invalid setting, `missing-input` for an event the destination
     cannot send, `transport` for a failed request; add `status` for an HTTP
     status, `retryable` to override the default). Never `return` early, never
     `return false` from `init`, never log the failure yourself: the collector
     counts the push as failed, keeps a DLQ entry and writes one ERROR line per
     cause (repeats within a minute are counted, not logged again).
   - Await every call the vendor makes. A call that is not awaited fails after
     the push was already counted as delivered. The lint rules
     `walkeros/await-send` and `walkeros/no-silent-return` flag both.
   - A response body goes on the error's `body`, never into its message;
     messages and log lines never carry event data.
   - A value-level problem (one mapped field cannot be built) drops that field,
     sends the event and reports once with `reportCause`. Only a wholly
     unsendable event throws `missing-input`.
9. **Scripts through `loadVendor`** (`@walkeros/web-core`). It injects the
   script once per page into the document `env` provides (the page's own by
   default) and reports `vendor-not-loaded`, `vendor-not-ready` and
   `vendor-timeout`. For tests and examples, `mockScriptDocument()` from
   `@walkeros/web-core/dev` provides a document. For a vendor that replays its
   own stub, call `check()` in `push`; for any other, `await ready()`. Pass
   attributes the tag needs (`data-domain`) through `options.attributes`.
10. **Honour `rule.silent`.** A rule with `silent: true` sends no event of its
    own and runs only the side effects it maps (identify, group). Do not
    `return` early for it (`walkeros/no-silent-return` is an error): write
    `push = async (event, context) => { if (!context.rule?.silent) await send(event, context); }`
    and run the side effects around it. A silent rule whose side-effect mapping
    resolves to nothing sends nothing, counts as delivered and writes one DEBUG
    line (`<Vendor> skipped <call>: <mappingKey> resolved to nothing`, the event
    name, never the value). Every destination ships a `silent` step example (see
    Phase 3).
11. **Consent reaches the vendor.** `config.consent` decides: in
    `on('consent')`, tell the vendor about a revocation and a grant when it has
    a switch (`getGrantedConsent(config.consent, collector.consent)`), and throw
    a `consent-not-applied` StepError when the vendor does not take it.
12. **Batching.** A server SDK that batches implements `pushBatch` and ships a
    default `config.batch` in the destination's own config (the server segment
    destination: `{ size: 15, wait: 10_000 }`); each entry has its own outcome,
    and `config.batch: { size: 1 }` is the per-event setting. See
    [batch scheduling](https://www.walkeros.io/docs/mapping/rule#batch-scheduling)
    for `size`, `wait` and `age`.

### Reserved fields

`config.setup` is reserved for the setup lifecycle (see
[Adding setup (optional)](#adding-setup-optional)). Do not use the key `setup`
for unrelated package metadata or hint keys. The framework wires this field to
`SetupFn` via `resolveSetup`, and `walkeros setup destination.<name>` reads it.
Repurposing the name will collide with that wiring.

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run verify:touched -- <platform>-destination-<name>` passes (L1:
      typecheck + lint + test; the argument is the package name after
      `@walkeros/`)

---

## Adding setup (optional)

A destination package can implement an optional `setup()` function to provision
external resources idempotently: BigQuery datasets and tables, Pub/Sub topics,
SQLite tables, warehouse schemas, S3 buckets, webhook registrations on
downstream platforms. Setup runs only when an operator explicitly types
`walkeros setup destination.<name>`. The runtime never auto-invokes it from
`init()`, `push()`, or `destroy()`.

The framework provides the slot, the CLI command, and a `resolveSetup` helper.
The package owns: what setup means, idempotency, error handling, return value.

For background on how setup fits the destination lifecycle, see
[understanding-destinations](../walkeros-understanding-destinations/SKILL.md#setup-optional).

### Types

```typescript
// types/index.ts
import type {
  Credential,
  Destination as CoreDestination,
  ServiceAccount,
} from '@walkeros/core';

export interface Settings {
  /* runtime push settings */
}
export interface InitSettings {
  /* one-time init settings */
}
export interface Mapping {
  /* per-event mapping config */
}
export interface Env {
  /* injected platform deps (SDK clients, etc.) */
}

// The package's own setup options interface.
// Becomes the U slot of Types; surfaces as `config.setup: boolean | Setup` for users.
export interface Setup {
  // package-specific provisioning options
  // e.g. for BigQuery: location, partitioning, clustering, schema
  location?: string;
  partitioning?: { field: string; type: 'DAY' | 'HOUR' };
}

// Service-account / key-pair credentials. Becomes the trailing C slot of Types;
// surfaces as the optional top-level `config.credentials` (sibling of `settings`),
// set with a `$secret.` reference and validated per package.
export type Credentials = Credential<ServiceAccount>;

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  Setup,
  Credentials
>;
```

**Where credentials belong.** Put service-account / key-pair credentials (the
kind paired with `$secret.NAME` to inject a secret) on the strictly-typed
top-level `config.credentials`, not inside `settings`. Read them from
`config.credentials`, and fall back to Application Default Credentials when they
are omitted. The raw `settings.<sdk>` passthrough (e.g. `settings.bigquery`)
stays as the lower-level escape hatch for SDK-specific auth options.

### Implementation

```typescript
// setup.ts
import type { Destination as CoreDestination, SetupFn } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type { Setup, Types } from './types';

const DEFAULT_SETUP: Setup = {
  location: 'EU',
};

export const setup: SetupFn<
  CoreDestination.Config<Types>,
  CoreDestination.Env<Types>
> = async ({ config, env, logger }) => {
  const options = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!options) return; // config.setup is false or unset

  // Package-specific provisioning, idempotent.
  // Returning a structured object (e.g. { datasetCreated: true })
  // makes that data available to operators via `walkeros setup ... | jq`.
};
```

Wire it in your default export:

```typescript
// index.ts
import type { Destination as CoreDestination } from '@walkeros/core';
import { setup } from './setup';
import type { Types } from './types';

export const destinationMine: CoreDestination.Instance<Types> = {
  type: 'my-destination',
  config: {},
  async push(event, context) {
    // Send the event (Phase 7)
  },
  setup,
};

export default destinationMine;
```

### When to implement

Implement `setup()` when your destination needs first-time provisioning of
external resources before events can flow: warehouse tables, Pub/Sub topics, S3
buckets, schema bindings, IAM roles, webhook registrations on downstream
platforms. Skip it when your destination only consumes credentials or HTTP
endpoints the user already provisioned.

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
  mandatory fields have no safe defaults (e.g., Kafka `numPartitions`, GitHub
  webhook `webhookUrl`), reject the boolean form with a clear runtime error
  listing required fields:

```typescript
if (config.setup === true) {
  throw new Error(
    'kafka destination setup requires explicit options: ' +
      '{ topic, numPartitions, replicationFactor }. There is no safe default.',
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

### Test Templates

Use the test templates:
[conformance.test.ts](./templates/simple/conformance.test.ts) (the conformance
kit and every event example) and
[index.test.ts](./templates/simple/index.test.ts) (the init example). Reference
canonical implementation:
`packages/web/destinations/meta/src/__tests__/conformance.test.ts`.

### Conformance test

Every destination has a conformance test that runs it on a real collector with
`conformance('destination', destination, options)` from
`@walkeros/collector/dev` (template:
[conformance.test.ts](./templates/simple/conformance.test.ts)). It checks the
failure contract: a failing send is reported with a cause, a failure never leaks
event data into a log line, a `silent` example sends nothing, a consent
revocation reaches the vendor, `init` throws on a missing setting, and every
event the destination cannot send has a declared outcome. It fails with every
broken item at once.

`conformance` does not compare a failure example's `outcome` with what the push
reported. The same test file therefore runs the event examples through
`runExamples` with `claims`, which compares each example's `out` and `outcome`:
a failure example with a wrong outcome fails the test and is not published under
"When it fails".

It also runs the minimal example: pass `minimal: examples.minimal` (the template
does), and the kit starts the destination with the settings its docs quickstart
shows and requires one public example delivered. A package without
`src/examples/minimal.ts` passes `withoutMinimal: '<reason>'` instead. A test
with neither, with both, or with an option that disagrees with the file fails
and says which option to pass, so a copied template without `minimal` fails.

The `profile` option says what the destination talks to: `http` (calls `fetch`),
`sdk-env` (a server SDK injected through `env`), `web-sdk` (a web SDK started in
`init`: `sdk-env` without the init check), `vendor-global` (a vendor script that
defines a global), `socket` (a long-lived connection). The browser profiles
(`web-sdk`, `vendor-global`) also take `page` from `@walkeros/web-core/dev`
(import it after the `@walkeros/collector/dev` import, pass it right after
`profile`); without it the test throws
`profile <name> runs on a page: pass page from @walkeros/web-core/dev`. Server
destinations pass no `page`. Never prove delivery or loss with a mocked
collector: `startFlow` and mock only the network or the vendor global.

### Key Test Patterns

1. **`runExamples` runs every event example** on a real collector, with `claims`
   listing the standard events the destination maps. Do not write per-feature
   tests with hand-rolled payloads.
2. **The init example runs on its own**: its `in` is a config, not an event.
3. **Zero hardcoded payloads**: every input, vendor config, and expected output
   comes from `examples.step` or `examples.env`. If you need something new, add
   it to examples first.
4. **Clone env per test**: `clone(examples.env.push)` so vendor mocks don't leak
   across tests.

### Gate: Tests Pass

- [ ] `npm run verify:touched -- <platform>-destination-<name>` passes (L1)
- [ ] The event examples run through `runExamples` with `claims`
- [ ] Tests contain no hardcoded payloads, vendor configs, or expected outputs
- [ ] Every assertion reads from `examples.step[...].out`
- [ ] The conformance test passes with the right profile and
      `minimal: examples.minimal` (or `withoutMinimal: '<reason>'`)
- [ ] `examples.step` has a `silent` example, a failure example (`outcome`, with
      a `description`) for each event the destination cannot send, and a consent
      revocation example when the vendor has a consent switch

---

## Phase 9: Document

Follow the [writing-documentation](../walkeros-writing-documentation/SKILL.md)
skill for:

- README structure and templates
- Example validation against `apps/quickstart/`
- Quality checklist before publishing

Key requirements for destination documentation:

- [ ] Event mapping table (walkerOS → vendor format)
- [ ] `## Installation` renders `<Quickstart data={data} />`: the install line,
      integrated code and `flow.json` generated from `examples.minimal`. No
      hand-written install or setup snippet there; the doc-lint fails one
- [ ] `<Configuration type="destination" data={data} />` renders settings,
      mapping, examples and "When it fails" (from the failure examples'
      `description`) from `walkerOS.json`

---

## Validation Checklist

Beyond
[understanding-development](../walkeros-understanding-development/SKILL.md)
requirements (build, test, lint, no `any`):

- [ ] Uses `getEnv<Env>(env)` pattern (never direct `window`/`document` access,
      never `as Window`/`as Document`/`as unknown` casts in src or tests)
- [ ] `dev.ts` exports `schemas` (with `settings`; `z.object({})` when the step
      has none) and `examples`
- [ ] Multi-export package (two or more `walkerOS.exports`): `exportExamples`
      and `exportSchemas` in `dev.ts` list exactly those exports, the default
      included, and every `exportSchemas` entry has `settings`; the build fails
      otherwise (see
      [using-step-examples](../walkeros-using-step-examples/SKILL.md))
- [ ] No silent path: a failure is a thrown StepError, every vendor call is
      awaited, `init` never returns `false`, scripts load through `loadVendor`,
      `rule.silent` is honoured
- [ ] Examples match type signatures
- [ ] Tests use examples for assertions (not hardcoded values)
- [ ] `walkerOS.json` generated at build time
- [ ] `walkerOS` field in package.json
- [ ] Works with no `env`: one test runs the published default export from a
      pure JSON config (no injected `env`, no mocked SDK) against a local fake
      endpoint on `127.0.0.1`, with the real vendor SDK and dummy credentials,
      and asserts what the fake received. Mocked-env tests cannot catch a
      missing `env?.X ?? X` fallback, which turns a bundled flow into a silent
      no-op

---

## Reference Files

| What            | Where                                        |
| --------------- | -------------------------------------------- |
| Simple template | `packages/web/destinations/plausible/`       |
| Complex example | `packages/web/destinations/gtag/`            |
| Types           | `packages/web/core/src/types/destination.ts` |

## Related Skills

- [understanding-destinations](../walkeros-understanding-destinations/SKILL.md) -
  Destination interface and env pattern
- [using-step-examples](../walkeros-using-step-examples/SKILL.md) -
  Authoritative `Flow.StepExample` pattern and Three Type Zones
- [testing-strategy](../walkeros-testing-strategy/SKILL.md) - Testing with env
  mocking and dev-examples-as-fixtures conventions
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards

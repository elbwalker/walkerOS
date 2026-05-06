---
name: walkeros-create-destination
description:
  Use when creating a new walkerOS destination. Example-driven workflow starting
  with research and examples before implementation.
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
handles transport, batching, retries, and plugin ecosystems — don't reinvent
these.

- [ ] **Install the SDK** — `npm install @vendor/sdk` and read the actual source
- [ ] **Read TypeScript types** — Import types from the SDK package directly.
      Never duplicate type definitions. This ensures IntelliSense completeness
      and consistency with SDK updates.
- [ ] **Understand the full API surface** — List every public method, not just
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

- [ ] **Init options** — What does `init()` accept? What can be configured?
- [ ] **Call ordering** — Can you call methods before `init()`? Is there
      internal queuing? What are the race condition implications?
- [ ] **Plugin system** — Does the SDK support plugins? How are they added?
- [ ] **Identity management** — How does the SDK handle user/device/session IDs?
      Does it manage cookies/storage? Can this be disabled (since walkerOS
      manages identity)?
- [ ] **Consent** — Does the SDK have a consent mode or just binary opt-out?

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

| Type             | Description                                    | Mapping Needed                         | Example Vendors       |
| ---------------- | ---------------------------------------------- | -------------------------------------- | --------------------- |
| **Free-form**    | Any event name accepted, no prescribed schema  | Minimal — names pass through           | Most modern analytics |
| **Rigid**        | Prescribed event names unlock specific reports | Essential — must map to exact names    | Some legacy analytics |
| **Schema-based** | Self-describing events with formal schemas     | Structural — must build schema objects | Data warehouse tools  |

### 2.2 Determine Integration Approach

| Approach                   | When to use                        | Pattern                                                    |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| **Vendor SDK as host**     | SDK has plugins, batching, retries | Load SDK, disable what walkerOS replaces, use as transport |
| **Script + command queue** | SDK loaded via script tag          | Load script, use global function queue                     |
| **HTTP API**               | No SDK available, or server-side   | Direct HTTP calls via `sendWeb()` or `fetch`               |

**Prefer the vendor SDK** — it handles transport, retries, and plugin
orchestration. HTTP API is a fallback when no SDK exists.

When using the vendor SDK:

- Disable features walkerOS replaces (autocapture, identity storage) **by
  default** — but allow users to re-enable via settings
- Pass through all SDK init options for full configurability
- Import types from the SDK package directly

### Gate: Classification Complete

- [ ] Taxonomy type identified (free-form / rigid / schema-based)
- [ ] Integration approach chosen (SDK / script / HTTP)
- [ ] Know which SDK features walkerOS replaces vs. uses

---

## Phase 3: Create Examples (BEFORE Implementation)

**Mandatory.** Examples are the test fixtures for Phase 8. Define expected `in`
/ `out` / `mapping` triples FIRST — start with the end result in mind. Without
examples, you cannot test. Even for free-form vendors where no mapping is
strictly "required," step examples serve as the single source of truth for
tests, simulations, and documentation.

> **Authoritative pattern:** See
> [using-step-examples](../walkeros-using-step-examples/SKILL.md) for the Three
> Type Zones and lifecycle. This skill reuses that contract — do not diverge.

### 3.1 Scaffold Directory Structure

```bash
mkdir -p packages/web/destinations/[name]/src/examples
mkdir -p packages/web/destinations/[name]/src/{schemas,types}
```

### 3.2 Required Files (3 files total)

All seven reference web destinations (gtag, meta, snowplow, plausible, piwikpro,
api, demo) use exactly three files in `src/examples/`. Match this structure — no
`events.ts`, `outputs.ts`, or standalone `mapping.ts`.

| File                | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `examples/env.ts`   | Mock environment for testing (no real network calls)              |
| `examples/step.ts`  | `Flow.StepExample` entries with `in` / `out` / `mapping?` triples |
| `examples/index.ts` | Barrel exports: `env` and `step`                                  |

The `step.ts` file embeds the input event, the mapping config, and the expected
vendor output together in one `Flow.StepExample` — subsuming what older skills
described as separate `events.ts` / `outputs.ts` / `mapping.ts` files.

### 3.3 Typing Rules (strict)

**No `any`.** Every example value must be explicitly typed.

- **Inputs** use `WalkerOS.Event` (via `getEvent()` from `@walkeros/core`) —
  never hand-roll event literals.
- **Outputs** use **vendor SDK types** imported from the official package
  whenever the vendor publishes them. Do not invent local output types for
  payloads the vendor already types (e.g. use Meta Pixel's `fbq` argument types,
  not a local `FbqCall` interface).
- **Step entries** are typed `Flow.StepExample` from `@walkeros/core`.
- **Mock env** is typed against the destination's local `Env` type from
  `../types`. No `as any`, no untyped `{}`.
- Vendor SDK types come from the SDK you installed in Phase 1 — reuse them
  rather than duplicating shapes.

### 3.4 Code Template — `examples/step.ts`

```typescript
import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

// One step example per supported feature / setting.
// `in`  is a WalkerOS.Event (use getEvent for deterministic fixtures).
// `out` is the vendor-specific call we expect the destination to produce —
//       typed against the vendor SDK's published types where available.
// `mapping` is the mapping rule under test (optional — omit for default push).

// Set `title` + `description` for public examples; mark test-only fixtures
// with `public: false`. See
// [walkeros-using-step-examples](../walkeros-using-step-examples/SKILL.md).

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000100 }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        transaction_id: 'data.id',
        value: 'data.total',
        currency: { key: 'data.currency', value: 'EUR' },
      },
    },
  },
  out: [
    'event',
    'purchase',
    {
      transaction_id: '0rd3r1d',
      value: 555,
      currency: 'EUR',
    },
  ],
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000102 }),
  mapping: undefined,
  out: ['event', 'page_view', { send_to: 'G-XXXXXX-1' }],
};

// For destinations that handle consent updates, use the command field
// to route `in` through elb('walker consent', in) instead of an event push:
export const consentGranted: Flow.StepExample = {
  command: 'consent',
  in: { marketing: true, functional: true },
  out: ['consent', 'update', { ad_storage: 'granted' }],
};
```

#### Init step example

Every destination ships an `examples.step.init` entry — the init is a
first-class step example, not a hidden side effect.

- `in` mirrors the real `Destination.Config` shape users copy-paste — typically
  `{ loadScript: true, settings: { /* vendor-specific */ } }`. Whatever a user
  would configure in their flow goes here verbatim.
- `out` is the ordered list of vendor calls the `init()` lifecycle produces
  (script tags, SDK initializers, queue setup). Each effect tuple follows the
  standard `[callable, ...args]` shape.

**Test pattern.** Call
`destination.init({ id, config, env, logger, collector })` directly in the test
— no capture helpers, no `capture.ts`, no allowlists. Assert the captured vendor
calls equal `examples.step.init.out`:

```typescript
const calls: unknown[][] = [];
const env = wrapEnv(examples.env.init, (call) => calls.push(call));
await destination.init({
  id: 'test',
  config: examples.step.init.in as Destination.Config,
  env,
  logger,
  collector,
});
expect(calls).toEqual(examples.step.init.out);
```

**Event step tests** bootstrap once with `examples.step.init.in`, then slice the
shared capture buffer to isolate push effects from init effects:

```typescript
const pushCalls = calls.slice(examples.step.init.out.length);
expect(pushCalls).toEqual(example.out);
```

There are no hand-maintained allowlists or `isInitEffect` filters — the init
example's `out.length` is the single source of truth for how many effects belong
to init.

**Multi-tool packages** (like `gtag`, which drives GA4, Google Ads, and GTM)
ship **per-tool init examples** — `examples.step.ga4Init`, `adsInit`, `gtmInit`
— instead of a single `init`. The docs render each on its own page via
`<StepExample example={data.examples.step.ga4Init} />`, and tests pick the right
init per sub-tool.

For destinations, the Three Type Zones collapse to:

- `in` = walkerOS event (`WalkerOS.Event`)
- `out` = vendor output (typed against vendor SDK)
- `mapping` = rule under test (optional)

### 3.5 `examples/index.ts` (barrel)

```typescript
export * as env from './env';
export * as step from './step';
```

### 3.6 `examples/env.ts`

Mock the vendor SDK surface and any DOM touchpoints. Never reach real network,
real cookies, or real globals. Type the exports against your local `Env`:

```typescript
import type { Env } from '../types';

export const init: Env | undefined = {
  /* pre-init state (vendor SDK not yet loaded) */
};

export const push: Env = {
  /* post-init state used for push() tests */
};
```

### 3.7 Test Fixture Contract (hard rule)

The examples authored here **are** the Phase 8 test fixtures. No parallel
fixtures allowed.

- `src/index.test.ts` (or `src/__tests__/stepExamples.test.ts`) **MUST** iterate
  examples via `it.each(Object.entries(examples.step))`.
- Tests **must NOT** contain hardcoded payloads, vendor configs, or expected
  outputs.
- If a test needs a value that is not in `examples.step`, **add it to `step.ts`
  first**, then consume it from the test. Never inline test data.
- The only per-test setup allowed is deriving destination `settings` from the
  example's `mapping.settings` (e.g. enabling the right sub-tool).

See `packages/web/destinations/gtag/src/__tests__/stepExamples.test.ts` for a
canonical reference.

### 3.8 Export via `dev.ts`

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Phase 3 Acceptance Checklist

- [ ] `src/examples/env.ts` — mock env, no real network, typed against local
      `Env`
- [ ] `src/examples/step.ts` — one `Flow.StepExample` per supported feature /
      setting, typed `in` / `out` / `mapping?`
- [ ] `src/examples/index.ts` — barrel exports `env` and `step`
- [ ] No standalone `events.ts`, `outputs.ts`, or `mapping.ts` files
- [ ] All vendor SDK types imported from the official package — no `any`, no
      reinvented local output types
- [ ] `src/index.test.ts` (or `__tests__/stepExamples.test.ts`) iterates
      `examples.step` via `it.each(Object.entries(...))`
- [ ] Tests contain zero hardcoded payloads / vendor configs / expected outputs
      — everything flows from `examples.step`
- [ ] `npm run build` passes — examples compile against published types
- [ ] Each example traces: `in` → apply `mapping` → matches `out`

---

## Phase 4: Define Mapping

**Goal:** Document transformation from walkerOS events to vendor format.

Mapping rules live **inside** each `Flow.StepExample` entry in `step.ts` — no
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

Replace `buildModules({ entry: ['src/dev.ts'] })` with `buildDev()`:

```typescript
import { buildDev } from '@walkeros/config/tsup';
// In defineConfig array:
buildDev(),
```

This auto-generates `dist/walkerOS.json` from your Zod schemas at build time.

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

- Expand awareness — describe capabilities ("supports X, Y, Z"), don't prescribe
  one path
- Reference schemas and examples, don't duplicate them
- Verify every claim against actual implementation before publishing
- Key naming: kebab-case, group with prefixes (auth-\*, storage-\*,
  troubleshoot-\*)
- Most destinations don't need hints — schemas and examples cover the common
  case

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

| File             | Purpose          | Template                                |
| ---------------- | ---------------- | --------------------------------------- |
| `types/index.ts` | Type definitions | [types.ts](./templates/simple/types.ts) |
| `index.ts`       | Main destination | [index.ts](./templates/simple/index.ts) |

### Key Patterns

1. **Init receives context**: Destructure `config`, `env`, `logger`, `id` from
   context
2. **Push receives context**: Includes `data`, `rule` (renamed from `mapping`),
   `ingest`
3. **Use `getEnv(env)`**: Never access `window`/`document` directly
4. **Return config from init**: Allows updating config during initialization
5. **Optional `destroy` method**: Implement if the destination holds resources
   (DB connections, SDK clients, timers) that need cleanup on shutdown. Call
   `flush()` or equivalent on the vendor SDK.
6. **Mapping-based settings** (recommended): Use standard walkerOS mapping
   values (`map`, `loop`, `key`, `value`, `condition`) in `mapping.settings.*`
   for vendor-specific operations. Resolve via `getMappingValue()` in `push()`
   and interpret the resolved object's keys as SDK method instructions. This
   keeps config agnostic and reuses the mapping engine.
7. **Consent two-layer**: `config.consent` gates walkerOS event delivery.
   `on('consent')` controls vendor SDK internals (opt-out, pause capture, etc.).
   Both needed for complete consent compliance.
   - For step-example tests, use `command: 'consent'` on `Flow.StepExample` to
     invoke the `on('consent')` handler. Do not push consent data as an event.

### Reserved fields

`config.setup` is reserved for the setup lifecycle (see
[Adding setup (optional)](#adding-setup-optional)). Do not use the key `setup`
for unrelated package metadata or hint keys. The framework wires this field to
`SetupFn` via `resolveSetup`, and `walkeros setup destination.<name>` reads it.
Repurposing the name will collide with that wiring.

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run verify:touched -- <destination-name>` passes (L1: typecheck +
      lint + test)

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
import type { CoreDestination } from '@walkeros/core';

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

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  Setup
>;
```

### Implementation

```typescript
// setup.ts
import type { CoreDestination, SetupFn } from '@walkeros/core';
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
import { setup } from './setup';

export default {
  type: 'my-destination',
  push: /* ... */,
  setup,
};
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

### Test Template

Use the test template: [index.test.ts](./templates/simple/index.test.ts).
Reference canonical implementation:
`packages/web/destinations/gtag/src/__tests__/stepExamples.test.ts`.

### Key Test Patterns

1. **`it.each(Object.entries(examples.step))` is mandatory** — one iteration per
   step example. Do not write per-feature tests with hand-rolled payloads.
2. **Use `createPushContext()` helper** — standardizes context creation.
3. **Include `id` field** — required in context.
4. **Use `rule` instead of `mapping`** — property renamed in `PushContext`.
5. **Zero hardcoded payloads** — every input, vendor config, and expected output
   comes from `examples.step` or `examples.env`. If you need something new, add
   it to examples first.
6. **Clone env per test** — `clone(examples.env.push)` so vendor mocks don't
   leak across iterations.

### Gate: Tests Pass

- [ ] `npm run verify:touched -- <destination-name>` passes (L1)
- [ ] Tests iterate via `it.each(Object.entries(examples.step))`
- [ ] Tests contain no hardcoded payloads, vendor configs, or expected outputs
- [ ] Every assertion reads from `examples.step[...].out`

---

## Phase 9: Document

Follow the [writing-documentation](../walkeros-writing-documentation/SKILL.md)
skill for:

- README structure and templates
- Example validation against `apps/quickstart/`
- Quality checklist before publishing

Key requirements for destination documentation:

- [ ] Event mapping table (walkerOS → vendor format)
- [ ] Configuration options table (use PropertyTable if schema exists)
- [ ] Working code example with imports
- [ ] Installation instructions

---

## Validation Checklist

Beyond
[understanding-development](../walkeros-understanding-development/SKILL.md)
requirements (build, test, lint, no `any`):

- [ ] Uses `getEnv(env)` pattern (never direct `window`/`document` access)
- [ ] `dev.ts` exports `schemas` and `examples`
- [ ] Examples match type signatures
- [ ] Tests use examples for assertions (not hardcoded values)
- [ ] `walkerOS.json` generated at build time
- [ ] `walkerOS` field in package.json

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
- [using-step-examples](../walkeros-using-step-examples/SKILL.md) —
  Authoritative `Flow.StepExample` pattern and Three Type Zones
- [testing-strategy](../walkeros-testing-strategy/SKILL.md) — Testing with env
  mocking and dev-examples-as-fixtures conventions
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards

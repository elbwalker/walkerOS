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
  env pattern
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards (for Phase 8)

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

**Mandatory.** Examples are the test fixtures for Phase 8. Define expected
in/out pairs FIRST — start with the end result in mind. Without examples, you
cannot test. Even for free-form vendors where no mapping is "required," examples
serve as test fixtures, simulation data, and documentation.

### 3.1 Scaffold Directory Structure

```bash
mkdir -p packages/web/destinations/[name]/src/{examples,schemas,types}
```

### 3.2 Create Example Files

Create these files based on the templates in this skill:

| File                  | Purpose                              | Template                            |
| --------------------- | ------------------------------------ | ----------------------------------- |
| `examples/outputs.ts` | Vendor API calls we will make        | [outputs.ts](./examples/outputs.ts) |
| `examples/events.ts`  | walkerOS events that trigger outputs | [events.ts](./examples/events.ts)   |
| `examples/env.ts`     | Mock environment for testing         | [env.ts](./examples/env.ts)         |
| `examples/mapping.ts` | Default event transformation         | [mapping.ts](./examples/mapping.ts) |

### 3.3 Step Examples

Add step examples with `{ in, out }` pairs for end-to-end step testing:

| File               | Purpose                         | Status |
| ------------------ | ------------------------------- | ------ |
| `examples/step.ts` | Step examples with in/out pairs | NEW    |

```typescript
// examples/step.ts
export const step = {
  purchase: {
    in: {
      name: 'order complete',
      data: { id: 'ORD-123', total: 149.97, currency: 'EUR' },
    },
    out: [
      'event',
      'purchase',
      { transaction_id: 'ORD-123', value: 149.97, currency: 'EUR' },
    ],
  },
};
```

For destinations, `in` is a walkerOS event and `out` is vendor-specific (gtag
args, API payload, pixel call). See
[using-step-examples](../walkeros-using-step-examples/SKILL.md) for the Three
Type Zones.

### 3.4 Export via dev.ts

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Gate: Examples Valid

- [ ] All example files compile (`npm run build`)
- [ ] Can trace: input event → expected output for each example
- [ ] Examples are complete enough to serve as test fixtures for Phase 8

---

## Phase 4: Define Mapping

**Goal:** Document transformation from walkerOS events to vendor format.

Use [mapping.ts](./examples/mapping.ts) as your template.

### Verify Mapping Logic

Create a mental (or actual) trace:

```
Input: events.pageView
  ↓ Apply mapping
  ↓ page.view rule matches
  ↓ name: 'pageview'
  ↓ data.path → url, data.title → title
Output: Should match outputs.pageViewCall
```

### Gate: Mapping Verified

- [ ] Mapping covers: page view + at least one conversion event
- [ ] Each mapping rule traces correctly to expected output

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

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run lint` passes

---

## Phase 8: Test Against Examples

> Tests verify implementation against the examples from Phase 3. If examples are
> incomplete, tests will be incomplete.

**Verify implementation produces expected outputs.**

### Test Template

Use the test template: [index.test.ts](./templates/simple/index.test.ts)

### Key Test Patterns

1. **Use `createPushContext()` helper** - Standardizes context creation
2. **Include `id` field** - Required in context (new requirement)
3. **Use `rule` instead of `mapping`** - Property renamed in PushContext
4. **Use examples for test data** - Don't hardcode test values
5. **Use `it.each` with step examples** - Iterate `examples.step` for coverage

### Gate: Tests Pass

- [ ] `npm run test` passes
- [ ] Tests verify against example outputs (not hardcoded values)

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
- [testing-strategy](../walkeros-testing-strategy/SKILL.md) - Testing with env
  mocking
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards

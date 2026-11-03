---
name: walkeros-create-cmp-source
description:
  Use when creating a new walkerOS CMP (consent management platform) source.
  Structured fill-in-the-blanks workflow that turns any CMP's consent API into a
  walkerOS source package. Covers CookieFirst, Usercentrics, CookiePro/OneTrust
  patterns and generalizes to any CMP.
---

# Create a CMP Source

A CMP source is a specialized walkerOS source that listens to a consent
management platform's events and translates consent states into
`elb('walker consent', state)` calls.

Every CMP source follows the same skeleton with only 5-6 decision points that
vary per CMP. This skill turns "build a new CMP source" into a structured
fill-in-the-blanks workflow.

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../walkeros-understanding-flow/SKILL.md) - How sources
  fit in architecture
- [understanding-sources](../walkeros-understanding-sources/SKILL.md) - Source
  interface
- [create-source](../walkeros-create-source/SKILL.md) - General source creation
  workflow
- [testing-strategy](../walkeros-testing-strategy/SKILL.md) - How to test
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards (for Phase 8)

## Supporting files

This skill includes reference files you can copy:

- **[examples/](examples/)** - Generic CMP consent examples to adapt for your
  CMP
  - [inputs.ts](examples/inputs.ts) - Consent input scenarios (full, partial,
    minimal, revocation)
  - [outputs.ts](examples/outputs.ts) - Expected walkerOS consent states after
    mapping
  - [env.ts](examples/env.ts) - Mock environment factories (createMockElbFn,
    createMockWindow, mockEnv)
- **[templates/cmp/](templates/cmp/)** - Complete CMP source implementation
  template
  - [index.ts](templates/cmp/index.ts) - Source implementation with detection
    paths + handleConsent
  - [types.ts](templates/cmp/types.ts) - Type definitions (Settings, CMP API,
    Types bundle)
  - [test-utils.ts](templates/cmp/test-utils.ts) - Test utilities (MockWindow,
    createMockElb, createCmpSource)
  - [index.test.ts](templates/cmp/index.test.ts) - Test suite skeleton (8
    describe blocks)

**Note:** These are generic templates for the skill. The actual CMP package's
examples go in `packages/web/sources/cmps/[name]/src/examples/`.

## Canonical template

**CookieFirst** at `packages/web/sources/cmps/cookiefirst/` is the canonical
template. Copy its structure for every new CMP source.

**Note:** The CookieFirst package.json predates this skill and lacks the
`walkerOS-source` keyword. New CMP sources MUST include it (the CookiePro and
Cookiebot packages do).

## Process overview

```
1. Research     -> Fill in the CMP research template
2. Examples     -> Create input/output examples (full, partial, minimal, revocation, edge cases)
3. Mapping      -> Define category map with sensible defaults
4. Scaffold     -> Copy from CookieFirst template
5. Convention   -> walkerOS.json, buildDev
6. Test         -> Write tests FIRST (TDD): 25-32 tests across 8-9 describe blocks
7. Implement    -> Wire up detection paths + handleConsent + destroy
8. Document     -> README + docs page, registered with the other CMP sources
```

---

## Phase 1: Research the CMP

**Goal:** Fill in every field of this template before writing any code.

### CMP research template

Fill in ALL of these fields for the target CMP:

| Field                             | Description                                                                                          | Example (CookieFirst)                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **CMP name**                      | Official product name                                                                                | CookieFirst                                                              |
| **Global window object**          | `window.X` shape and key properties                                                                  | `window.CookieFirst.consent` (boolean map)                               |
| **SDK events**                    | Event names, `CustomEvent` detail structure                                                          | `cf_init` (Event), `cf_consent` (CustomEvent with consent detail)        |
| **Callbacks/hooks**               | Function wrapping patterns                                                                           | None                                                                     |
| **Category naming**               | Human-readable vs opaque IDs                                                                         | Human-readable (`necessary`, `functional`, `performance`, `advertising`) |
| **Consent access pattern**        | Is consent read from a property (`window.CMP.consent`) or an API method (`CMP.getConsent()`)?        | Property: `window.CookieFirst.consent`                                   |
| **Explicit consent detection**    | API or mechanism to check if user actively chose                                                     | `consent === null` means no explicit choice                              |
| **"Already loaded" detection**    | How to detect CMP loaded before source                                                               | `window.CookieFirst.consent` exists and is non-null                      |
| **Official docs URL**             | Link to CMP's developer/API documentation                                                            | CookieFirst Public API docs                                              |
| **npm packages / TS types**       | Available type packages                                                                              | None (define own types)                                                  |
| **Timing constraints**            | Does the source need to load before/after the CMP? Any `require` config needed?                      | No `require`: consent sources should init immediately                    |
| **Event registration mechanism**  | How does the CMP register event listeners? `addEventListener`, callback assignment, SDK method?      | `addEventListener` (standard DOM events)                                 |
| **Cleanup/unsubscribe mechanism** | How to remove listeners on destroy? `removeEventListener`, nullify callback, SDK unsubscribe method? | `removeEventListener` (standard DOM cleanup)                             |
| **SDK readiness pattern**         | How does the CMP signal its SDK is ready? DOM event, callback array, global flag, Promise?           | `cf_init` DOM event                                                      |

### Detection paths

Every CMP source needs up to 3 detection paths:

| Path                | Purpose                  | Questions to answer                                                                                             |
| ------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Already loaded**  | CMP loaded before source | Is there a global object to check? What state does it expose? Is consent read from a property or an API method? |
| **Init listener**   | CMP loads after source   | What event/callback fires on SDK init? Is it a DOM event, callback assignment, or SDK readiness array?          |
| **Change listener** | User updates consent     | What event fires on consent change? Is it the same as init?                                                     |

### Event registration patterns

Not all CMPs use `addEventListener`. Fill in "Event registration mechanism" in
the research template to determine which pattern applies:

| Pattern                 | CMPs                              | Registration                         | Cleanup                              |
| ----------------------- | --------------------------------- | ------------------------------------ | ------------------------------------ |
| **DOM events**          | CookieFirst, CookiePro, Cookiebot | `addEventListener(name, handler)`    | `removeEventListener(name, handler)` |
| **Callback assignment** | CookiePro (`OptanonWrapper`)      | `window.OptanonWrapper = handler`    | `window.OptanonWrapper = original`   |
| **SDK readiness array** | Didomi (`didomiOnReady`)          | `window.didomiOnReady.push(handler)` | No unsubscribe (fires once)          |
| **SDK method**          | Didomi (`on`)                     | `CMP.on('consent.changed', handler)` | Vendor-specific (check docs)         |

This affects the source skeleton (Phase 7), MockWindow shape (Phase 6), and
destroy implementation.

### Decision matrix

Fill in this matrix for your CMP. Reference implementations for comparison:

| Decision                | CookieFirst                             | Usercentrics                                                                                     | CookiePro                                        | Cookiebot                                                                   |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------- |
| Already loaded?         | `window.CookieFirst.consent`            | Getter read at init (V3 `__ucCmp.getConsentDetails()`, V2 `UC_UI.getServicesBaseInfo()`)         | `window.OneTrust` + `window.OptanonActiveGroups` | `window.Cookiebot` with `hasResponse`                                       |
| Init listener           | `cf_init` event                         | `UC_UI_INITIALIZED` event, then the getter                                                       | `OptanonWrapper` callback (self-unwrap)          | None separate: the change events re-fire on every load with a stored choice |
| Change listener         | `cf_consent` event                      | `UC_UI_CMP_EVENT` decisions (`ACCEPT_ALL`, `DENY_ALL`, `SAVE`), then the getter                  | `OneTrustGroupsUpdated` event                    | `CookiebotOnAccept` / `CookiebotOnDecline` events                           |
| Consent shape           | Boolean map `{ category: bool }`        | Category states (V3 `categories`, V2 services grouped by `categorySlug`)                         | Comma-separated IDs `,C0001,C0003,`              | Boolean map plus `method` and `stamp`                                       |
| Category naming         | Human-readable                          | Admin-configured                                                                                 | Opaque IDs (C0001-C0005)                         | Fixed (`necessary`, `preferences`, `statistics`, `marketing`)               |
| Explicit check          | `consent === null`                      | Official consent metadata (V3 `consent.type`; V2 an `EXPLICIT` entry in service consent history) | `IsAlertBoxClosed()`                             | `consent.method === 'explicit'`                                             |
| Default categoryMap     | Populated (human names to walkerOS)     | Empty (pass-through)                                                                             | Populated (opaque IDs need mapping)              | Populated, `necessary` left unmapped                                        |
| Number of change events | 1 (`cf_consent`)                        | 1 (`UC_UI_CMP_EVENT`, which also fires for UI events that are no decision)                       | 2 (`OptanonWrapper` + `OneTrustGroupsUpdated`)   | 2 (accept, decline), plus `CookieConsentOn*` aliases that are not used      |
| Consent layers          | Single (categories only)                | Single (categories; services are read only to group them)                                        | Single (categories only)                         | Single (categories only)                                                    |
| Consent access          | Property (`window.CookieFirst.consent`) | API method (the getter; the event carries no consent)                                            | Property (`window.OptanonActiveGroups`)          | Property (`window.Cookiebot.consent`)                                       |
| Event registration      | `addEventListener`                      | `addEventListener`                                                                               | Callback assignment + `addEventListener`         | `addEventListener`                                                          |

### Gate: Research complete

- [ ] All fields in the research template filled
- [ ] Detection paths identified (which of the 3 apply)
- [ ] Decision matrix row completed for the new CMP
- [ ] Official docs URL captured

---

## Phase 2: Create examples

**Goal:** Define realistic consent data BEFORE writing implementation.

### Required example inputs

Create at minimum these scenarios in `src/examples/inputs.ts`. See
[inputs.ts](./examples/inputs.ts) for the generic template.

| Example           | Purpose                            | Description                                                                                                                                                                               |
| ----------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fullConsent`     | All categories accepted            | User clicked "Accept All"                                                                                                                                                                 |
| `partialConsent`  | Some categories accepted           | User customized consent                                                                                                                                                                   |
| `minimalConsent`  | Only essential/necessary           | User clicked "Deny All" or similar                                                                                                                                                        |
| `implicitConsent` | Page-load defaults (if applicable) | CMP loaded but user hasn't chosen. **Note:** behavior varies by CMP: some grant nothing by default, others grant functional/necessary. Research the specific CMP's default consent state. |
| `noConsent`       | No consent data available          | CMP hasn't loaded yet                                                                                                                                                                     |
| `revocationInput` | Consent withdrawal                 | User goes from full to partial                                                                                                                                                            |

Add CMP-specific edge cases:

- **Case sensitivity:** Uppercase/lowercase variants of consent fields
- **Service-level consent:** If CMP supports individual service booleans
- **Custom categories:** Non-standard category IDs
- **Empty/malformed data:** Edge cases for the consent shape

### Required example outputs

Create expected walkerOS consent states in `src/examples/outputs.ts`. See
[outputs.ts](./examples/outputs.ts) for the generic template.

Key rule: denied groups MUST have explicit `false`, not be omitted (see
mandatory check #1).

### Example env

Create mock factories in `src/examples/env.ts`. See [env.ts](./examples/env.ts)
for the generic template.

### Step examples

`src/examples/step.ts` turns the inputs into `Flow.StepExample` entries: the CMP
input as `in`, a `trigger` that says how to deliver it, and the consent command
the source issues as `out` (`[['elb', 'walker consent', state]]`).
`src/examples/trigger.ts` exports the `createTrigger` that feeds them (see
[create-source](../walkeros-create-source/SKILL.md), Phase 3). The docs page,
`walkeros push --simulate source.<id>` and the step example tests read them;
`packages/web/sources/cmps/usercentrics/src/examples/step.ts` builds its
examples from its `inputs.ts` and `outputs.ts`.

### Export via dev.ts

```typescript
// src/dev.ts
export * as examples from './examples';
export * as schemas from './schemas';
```

`schemas` carries the settings schema (`categoryMap`, `explicitOnly`, ...):
`buildDev()` fails the build without it.

### Gate: Examples valid

- [ ] All example files compile
- [ ] Can trace: each input -> expected output for each example
- [ ] Edge cases included (case sensitivity, empty data, revocation)

---

## Phase 3: Define category mapping

**Goal:** Decide default `categoryMap` and document mapping rationale.

### When to use a populated default map

Use a populated default when the CMP uses **opaque or non-standard category
names** that are meaningless without mapping:

```typescript
// CookiePro: opaque IDs require mapping
export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  C0001: 'necessary', // Strictly Necessary, grants no consent group (check 11)
  C0002: 'analytics', // Performance
  C0003: 'functional', // Functional
  C0004: 'marketing', // Targeting
  C0005: 'social', // Social Media
};
```

### When to use an empty default map

Use an empty default when the CMP uses **human-readable, admin-configured
category names** that can pass through as-is:

```typescript
// Usercentrics: admin-configured names pass through
const settings: Settings = {
  categoryMap: config?.settings?.categoryMap ?? {},
};
```

### Merging behavior

Custom entries merge with (and override) defaults:

```typescript
const mergedCategoryMap = {
  ...DEFAULT_CATEGORY_MAP,
  ...(config?.settings?.categoryMap ?? {}),
};
```

### Any deny denies for many-to-one mappings

When multiple CMP categories map to the same walkerOS group, the group is `true`
only if every one of them is `true`: any deny denies. All CMP sources follow
this rule. For a presence list (CookiePro), an inactive ID is a denial. Keep the
default map one category per group, so the rule only matters for a user's own
map.

```typescript
// Any deny denies: once false, stays false
state[mapped] = state[mapped] === undefined ? value : state[mapped] && value;
```

### Dual-layer consent (categories + services/vendors)

Some CMPs expose consent at multiple layers (e.g., Didomi: purposes + vendors).
When the decision matrix shows "Consent layers: Dual," decide how to handle:

**Option A: Map primary layer only (recommended for most cases).** Use the
category/purpose layer and ignore the service/vendor layer. This matches
walkerOS's category-level `WalkerOS.Consent` model directly.

**Option B: Expose both layers via settings.** Add a setting like
`consentLayer: 'categories' | 'services'` and map whichever the user chooses.
Use this when the CMP's service-level consent is meaningfully different from its
category-level consent.

Document the chosen approach in the README under "How it works."

### Gate: Mapping defined

- [ ] Default categoryMap chosen (populated or empty, with rationale)
- [ ] Any-deny-denies rule for many-to-one mappings documented
- [ ] Merge behavior with user overrides documented
- [ ] Dual-layer strategy decided (if applicable per decision matrix)

---

## Phase 4: Scaffold

**Goal:** Create package structure mirroring CookieFirst.

### Directory structure

```
packages/web/sources/cmps/[name]/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
├── README.md
└── src/
    ├── index.ts                    # Main source export
    ├── dev.ts                      # Dev exports (examples, schemas)
    ├── schemas/
    │   └── index.ts                # Settings schema
    ├── types/
    │   └── index.ts                # Types, Settings, CMP API interface, declare global
    ├── examples/
    │   ├── index.ts                # Re-exports
    │   ├── inputs.ts               # CMP consent input examples
    │   ├── outputs.ts              # Expected walkerOS consent outputs
    │   ├── step.ts                 # Step examples built from inputs and outputs
    │   ├── trigger.ts              # createTrigger
    │   └── env.ts                  # Mock factories
    └── __tests__/
        ├── index.test.ts           # Full test suite
        └── test-utils.ts           # createMockElb, createMockWindow, createSource
```

### package.json template

`[version]` is the version every `@walkeros/*` package currently has (see
`packages/core/package.json`); they are released together.

```json
{
  "name": "@walkeros/web-source-cmp-[name]",
  "description": "[CMP Name] consent management source for walkerOS",
  "version": "[version]",
  "license": "MIT",
  "walkerOS": {
    "type": "source",
    "platform": "web",
    "docs": "https://www.walkeros.io/docs/sources/web/cmps/[name]"
  },
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./examples": {
      "types": "./dist/examples/index.d.ts",
      "import": "./dist/examples/index.mjs",
      "require": "./dist/examples/index.js"
    },
    "./dev": {
      "types": "./dist/dev.d.ts",
      "import": "./dist/dev.mjs",
      "require": "./dist/dev.js"
    },
    "./walkerOS.json": "./dist/walkerOS.json"
  },
  "files": ["dist/**", "CHANGELOG.md"],
  "scripts": {
    "build": "tsup --silent",
    "clean": "rm -rf .turbo && rm -rf dist",
    "dev": "jest --watchAll --colors",
    "lint": "eslint \"**/*.ts*\"",
    "test": "jest",
    "typecheck": "tsc --noEmit",
    "update": "npx npm-check-updates -u && npm update"
  },
  "dependencies": {
    "@walkeros/core": "[version]",
    "@walkeros/collector": "[version]"
  },
  "repository": {
    "url": "git+https://github.com/elbwalker/walkerOS.git",
    "directory": "packages/web/sources/cmps/[name]"
  },
  "author": "elbwalker <hello@elbwalker.com>",
  "keywords": [
    "walker",
    "walkerOS",
    "walkerOS-source",
    "source",
    "web",
    "[name]",
    "consent",
    "cmp"
  ]
}
```

### Config files

Copy these exactly from CookieFirst, updating only the `globalName`:

- `tsconfig.json` - extends `@walkeros/config/tsconfig/web.json`
- `tsup.config.ts` - uses `buildModules`, `buildExamples`, `buildBrowser`,
  `buildES5` and `buildDev`
- `jest.config.mjs` - extends `@walkeros/config/jest/web.config`

---

## Phase 5: walkerOS.json convention

### Add `walkerOS` field to package.json

```json
{ "walkerOS": { "type": "source", "platform": "web" } }
```

### Use `buildDev()` in tsup.config.ts

Use the standard `buildDev()` helper from `@walkeros/config/tsup` (consistent
with `create-source` and `create-destination` skills):

```typescript
import { buildDev } from '@walkeros/config/tsup';
// In defineConfig array:
buildDev(),
```

The CookieFirst `tsup.config.ts` already has it.

### Hints (Optional)

If your CMP source has non-obvious behaviors or troubleshooting patterns, add
hints. See `walkeros-writing-documentation` skill for full guidelines and
`walkeros-create-source` skill for the hints pattern.

### Gate: Convention met

- [ ] `walkerOS` field in package.json with type and platform
- [ ] Dev build configured in tsup.config.ts
- [ ] Keywords include `walkerOS` and `walkerOS-source`

---

## Phase 6: Test (TDD: write tests BEFORE implementation)

**Goal:** Write the full test suite first. Watch it fail. Then implement.

### Test structure (8-9 describe blocks)

| Describe block                | Tests | What it covers                                                                                |
| ----------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| `initialization`              | 4-6   | No errors, correct type, default settings, custom settings, listener registration             |
| `explicit consent filtering`  | 3-4   | Explicit events processed, implicit ignored/processed based on setting, case-insensitive type |
| `non-consent event filtering` | 2     | Non-consent events ignored, events without detail ignored                                     |
| `category mapping`            | 5-8   | Full/partial/minimal consent, custom mapping, unmapped categories, any deny denies            |
| `[CMP-specific parsing]`      | 2-4   | CMP-specific consent format parsing (service-level, string parsing, etc.)                     |
| `event handling`              | 3     | Consent changes, multiple changes, revocation                                                 |
| `consent revocation`          | 2     | Full->partial, full->minimal (explicit false values verified)                                 |
| `cleanup`                     | 2     | Destroy removes listeners, restores wrapped functions                                         |
| `no window environment`       | 1     | Handles missing window gracefully                                                             |

### Test utilities pattern (MockWindow)

See [test-utils.ts](./templates/cmp/test-utils.ts) for the complete template
including `MockWindow` interface, `createMockElb`, `createMockWindow`, and
`createCmpSource` factories.

For CMPs that use callback assignment or SDK methods instead of
`addEventListener` (e.g., Didomi's `onReady`, CookiePro's `OptanonWrapper`),
adapt `MockWindow` to expose those callbacks as testable properties.

### Test template

Use the test template: [index.test.ts](./templates/cmp/index.test.ts)

### Gate: Tests fail for the right reason

- [ ] Tests fail with "Cannot find module '../index'" (module doesn't exist yet)
- [ ] Tests use example outputs for assertions (not hardcoded values)
- [ ] Consent revocation test included (full grant -> revoke -> verify explicit
      `false`)

---

## Phase 7: Implement

**Goal:** Wire up detection paths, handleConsent, and destroy. Make tests pass.

### v4 source identity

CMP sources register their `type` literal via `SourceMap` in `src/types.ts`.
CMPs are web by default - `platform` is optional in the augmentation:

```typescript
import type { Source } from '@walkeros/core';

declare module '@walkeros/core' {
  interface SourceMap {
    // Replace with the CMP's package-level identifier.
    cookiefirst: {
      type: 'cookiefirst';
      platform?: 'web'; // optional: CMP runs on web by default
    };
  }
}
```

The source returns `{ type: 'cookiefirst', config, push, init, destroy }` from
`Source.Init`; the `type` literal must match the `SourceMap` key.

**CMP sources do NOT set `source.url` or `source.referrer`.** A CMP only knows
about consent state, not the page that produced it; the browser, dataLayer and
session sources set the page context of the events they push. Don't reach for
`window.location` in CMP source code, leave those fields untouched.

### Settings interface pattern

See [types.ts](./templates/cmp/types.ts) for the complete type definitions
including `Settings`, `InitSettings`, `Types` bundle, CMP API interfaces, and
`declare global` window augmentation.

The core settings of a CMP source:

- `categoryMap?: Record<string, string>`: maps CMP categories to walkerOS
  consent groups (every CMP source)
- `explicitOnly?: boolean`: for a CMP that reports implicit or default consent
  before the visitor decides (Usercentrics, CookiePro, Cookiebot). Default
  `true`: the source reports only explicit choices, so a visitor the CMP never
  asks sends no consent; `false` also reports implicit or default consent.
  CookieFirst reports consent only after a choice (`consent` is `null` before),
  so its source has no such setting.
- `globalName?: string`: only where the CMP lets a site rename its global;
  Cookiebot hard-codes `window.Cookiebot`, so its source has no such setting

### Source skeleton

Every CMP source follows this skeleton with 5-6 decision points. See
[index.ts](./templates/cmp/index.ts) for the complete template.

Key implementation steps:

1. Resolve window (`env.window` fallback to `globalThis`)
2. Merge settings with defaults
3. Track listener references for cleanup
4. `handleConsent` function (explicitOnly, categoryMap with any deny denies,
   `elb('walker consent', state)`)
5. Detection path: Already loaded
6. Detection path: Init listener
7. Detection path: Change listener

**The factory MUST be side-effect-free; do the detection paths in `init()`.**
Steps 5-7 attach listeners and perform the "already loaded" static consent read,
which emits `elb('walker consent', state)`. Put them inside an `init()` method
on the returned instance, NOT in the factory body. The collector runs the
factory in Pass 1 (before all sources are merged) and `init()` in Pass 2.
Emitting consent from the factory races source merge order and can leave a later
`require:["consent"]` source parked. Return
`{ type, config, push, init, destroy }`; `init` runs the static read + attaches
listeners, `destroy` removes them. (The collector also matches `require` against
current recorded state, so a consent read from `init()` still activates
dependent steps regardless of order, but a side-effect-free factory is the
contract.)

**Note on init listeners:** Some init listeners (like CookieFirst's `cf_init`)
read consent from the global window object, not from `event.detail`. Others
(like `cf_consent`) receive consent via `event.detail`. Check which pattern your
CMP uses for each detection path.

### Gate: All tests pass

- [ ] `npm run verify:touched -- web-source-cmp-<name>` passes (L1: typecheck +
      lint + test; the argument is the package name after `@walkeros/`)
- [ ] `npm run build` passes

---

## Phase 8: Document

### README structure

Keep it short and point to the docs page, like the existing CMP sources
(sentence-case headings, imports in code examples):

```markdown
<logo>

# @walkeros/web-source-cmp-[name]

[One line: what the source integrates and how it maps categories.]

Documentation | NPM Package | Source Code

## Installation

## Quick start (startFlow with imports)

## Documentation (link to the docs page)

## Contribute

## License
```

### Create the docs page

Create the docs page at `website/docs/sources/web/cmps/[cmp-name]/index.mdx`,
following the CookiePro page
(`website/docs/sources/web/cmps/cookiepro/index.mdx`): installation with
imports, the `<Configuration>` block fed by the package's `walkerOS.json`, how
it works, the default category mapping, a custom mapping example and timing
considerations. Then register the page:

1. Add it to the CMPs category in `website/sidebars.ts`
2. Add a row to the table in `website/docs/sources/web/cmps/index.mdx`, and name
   the source where that page and `website/docs/guides/consent/index.mdx`
   compare the CMP sources
3. Add the package to `website/package.json` so the page can import its
   `walkerOS.json`

---

## Mandatory checks

These are non-negotiable patterns every CMP source MUST follow. Violating any of
these is a privacy compliance issue or a correctness bug.

### 1. Ensure every consent update includes explicit `false` for denied groups

The collector uses merge semantics (`assign()`), so omitting a key means "no
change," NOT "denied." Every consent state passed to
`elb('walker consent', state)` must include explicit `false` for denied groups,
not just `true` for granted ones.

**Boolean-map CMPs** (CookieFirst, Usercentrics group-level): The CMP's consent
object already contains explicit `false` values (e.g.,
`{ marketing: false, functional: true }`). These flow through naturally via
iteration, no extra code needed.

**Presence-based CMPs** (CookiePro): Only active groups are listed (e.g.,
`",C0001,C0003,"`). Absence means denied. You MUST give EVERY mapped group an
explicit value, `true` only when every ID mapped to it is active (any deny
denies):

```typescript
// Presence-based CMPs: walk the map, not the active IDs
const active = new Set(activeIds.map((id) => id.toLowerCase()));
Object.entries(normalizedMap).forEach(([id, group]) => {
  const granted = active.has(id);
  state[group] = state[group] === undefined ? granted : state[group] && granted;
});
```

### 2. Case-insensitive comparison for all CMP string fields

Use `.toLowerCase()`. CMP docs are inconsistent on casing.

```typescript
// Explicit type check
if (settings.explicitOnly && detail.type?.toLowerCase() !== 'explicit') return;

// Category ID lookup
const mapped = normalizedMap[id.toLowerCase()];
```

### 3. Apply `categoryMap` consistently in ALL code paths

If there are multiple parsing branches (group-level vs service-level, or
already-loaded vs event-listener), mapping MUST work identically in each.

### 4. Prevent dual-firing on consent events

Many CMPs fire multiple signals for the same consent action. If you don't guard
against this, `handleConsent` fires twice per user action. Three known patterns:

The collector's exactly-once delivery does not solve this for you: it guarantees
each subscriber sees a given state version once, but two upstream CMP signals (a
callback plus a DOM event) are two distinct consent commands, so both are
delivered legitimately. Coalescing duplicate upstream signals is the source's
job, as below.

**Pattern A: Callback + event (CookiePro)** CMP fires both a callback
(`OptanonWrapper`) and a DOM event (`OneTrustGroupsUpdated`) on the same action.
Use the callback for init only and self-unwrap after first call:

```typescript
actualWindow.OptanonWrapper = () => {
  if (originalWrapper) originalWrapper();
  handleConsent();
  actualWindow.OptanonWrapper = originalWrapper; // Self-unwrap
};
```

**Pattern B: Change events that re-fire on load (Cookiebot)** CMP fires one of
several events per decision (`CookiebotOnAccept`, `CookiebotOnDecline`), and
fires it again on every page load with a stored choice. Register the SAME
handler for all of them, and listen to one name set only: Cookiebot also
dispatches each event under a `CookieConsentOn*` alias. Because the static read
at init and the load-time event report the same choice, drop a state identical
to the last one the source sent.

**Pattern C: One event bus for every UI event (Usercentrics)** Usercentrics
fires `UC_UI_CMP_EVENT` for decisions and for UI events such as a view change.
Handle only the decision types (`ACCEPT_ALL`, `DENY_ALL`, `SAVE`) from the event
detail, and read the consent from the getter (the event carries none). A view
toggle then publishes nothing.

**Research step:** During Phase 1, fill in "Number of change events" in the
decision matrix. If >1, determine which pattern applies and plan accordingly.

### 5. Document timing/race conditions in the README

What if the CMP loads before the source? What about `explicitOnly: false`? Each
CMP has different timing behavior: document it explicitly under "Timing
considerations."

For "previous-choice" detection (was this an active user decision or a
first-visit default?), read the CMP's official consent metadata, the consent
type or decision history (e.g. Usercentrics V3 `consent.type`, V2 the service
consent history), not a per-pageload event `type` field. A per-pageload event
`type` conflates first-visit defaults with a returning visitor's restored
choice, so a returning visitor's prior consent would be dropped under
`explicitOnly`.

### 6. Test consent revocation end-to-end

Full grant -> revoke -> verify denied (explicit `false` values). This is the
most common source of bugs.

```typescript
test('handles consent withdrawal (full to partial)', async () => {
  const mockWindow = createMockWindow(inputs.fullConsent);
  await createCmpSource(mockWindow, mockElb);

  // Initial: full consent, read at init
  expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);

  // User revokes marketing and analytics
  mockWindow.__dispatchEvent('cmp_consent', inputs.revocationInput);
  expect(consentCalls[1].consent.marketing).toBe(false); // explicit false
  expect(consentCalls[1].consent.analytics).toBe(false); // explicit false
});
```

This is the revocation test of the template
([index.test.ts](./templates/cmp/index.test.ts)); `cmp_consent` stands for your
CMP's change event.

### 7. Use `MockWindow` interface in tests

Properly typed, not `as unknown as` casts scattered through tests. Define one
`MockWindow` interface in `test-utils.ts` that extends the source's **narrowed**
`CmpWindow` (the surface the source actually touches), not the global `Window`.
Because `Env.window` is narrowed to `CmpWindow` (as the template and the
Cookiebot source do), the mock literal satisfies it directly, with no
`as unknown as Window` cast.

### 8. Store category keys in user-expected format

Normalize during init for case-insensitive lookup, but store the original keys
in the config so users see what they configured.

```typescript
// Store original casing in config
const mergedCategoryMap = { ...DEFAULT_CATEGORY_MAP, ...userMap };

// Build normalized lookup for internal use
const normalizedMap: Record<string, string> = {};
Object.entries(mergedCategoryMap).forEach(([key, value]) => {
  normalizedMap[key.toLowerCase()] = value;
});
```

### 9. `walkerOS.json` convention

Add `"walkerOS": { "type": "source", "platform": "web" }` to `package.json`.

### 10. README requirements

Keep the README short, as the existing CMP sources do: logo, one-line
description, Documentation/NPM/Source Code links, installation, a quick start
with imports, a link to the docs page, contribute and license sections, sentence
case headings. Configuration, mapping, how it works and timing considerations
belong on the docs page (see "Create the docs page").

### 11. Strictly necessary cookies grant no consent group

Strictly necessary cookies need no consent, and the CMP grants them with every
choice. Never map such a category (`necessary`, `C0001`, an essential category)
to a consent group like `functional` in the default `categoryMap`: as the only
category of that group, it would grant the group with every choice, and every
destination that requires the group would act on consent the visitor never gave.
Report it under its own name (`necessary`) or leave it out, and cover it with a
test: a choice that grants only strictly necessary cookies leaves every group
except `necessary` `false`.

---

## Validation checklist

Beyond
[understanding-development](../walkeros-understanding-development/SKILL.md)
requirements (build, test, lint, no `any`):

- [ ] All 11 mandatory checks pass
- [ ] Research template fully filled
- [ ] Decision matrix row complete
- [ ] Examples include revocation and edge cases
- [ ] Tests: 25-32 tests across 8-9 describe blocks
- [ ] `MockWindow` interface in test-utils (not scattered casts)
- [ ] Category mapping: any deny denies for many-to-one
- [ ] Consent state always includes explicit `false` for denied groups
- [ ] `destroy()` cleans up ALL listeners and restores wrapped functions
- [ ] Detection never fails silently: a setting the source needs that is missing
      throws a `StepError` (`code: 'config'`) from `init`, and `init` never
      returns early or returns `false`; a CMP that is simply absent is not an
      error (consent stays unknown)
- [ ] README follows required structure
- [ ] Docs page created and registered (Phase 8)

---

## Known limitations

The skill's source skeleton and code templates are based on DOM-event CMPs
(CookieFirst, Usercentrics, CookiePro). CMPs that deviate significantly from
this pattern will require adaptation:

| Limitation                                     | Affected CMPs                                              | Workaround                                                                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source skeleton assumes `addEventListener`** | Didomi (SDK array/method)                                  | Use the "Event registration patterns" table in Phase 1 to identify the correct pattern, then adapt the skeleton's listener setup and `destroy()` accordingly. |
| **Consent read via property, not API method**  | Didomi (`getCurrentUserStatus()`)                          | If consent is accessed via an API method call rather than a window property, wrap the call in `handleConsent` and adjust the "already loaded" detection path. |
| **`destroy()` may not be possible**            | CMPs with SDK readiness arrays (fire-once, no unsubscribe) | Document in README that the init callback cannot be removed. Only the change listener needs cleanup.                                                          |
| **No vendor-level consent model**              | Didomi (purposes + vendors as separate consent layers)     | Use the "Dual-layer consent" guidance in Phase 3. walkerOS `Consent` is category-level; vendor-level consent requires flattening or a `consentLayer` setting. |

These are research-phase decisions; the skill's phases, mandatory checks, and
validation checklist still apply. The research template and decision matrix
capture these variations so they are identified early.

---

## Reference files

| What                | Where                                     |
| ------------------- | ----------------------------------------- |
| Skill examples      | [examples/](examples/)                    |
| Skill templates     | [templates/cmp/](templates/cmp/)          |
| Canonical template  | `packages/web/sources/cmps/cookiefirst/`  |
| Source types        | `packages/core/src/types/source.ts`       |
| Consent guide       | `website/docs/guides/consent/`            |
| Usercentrics source | `packages/web/sources/cmps/usercentrics/` |
| CookiePro source    | `packages/web/sources/cmps/cookiepro/`    |

## Related skills

- [walkeros-create-source](../walkeros-create-source/SKILL.md) - General source
  creation workflow
- [walkeros-understanding-sources](../walkeros-understanding-sources/SKILL.md) -
  Source interface and push pattern
- [walkeros-testing-strategy](../walkeros-testing-strategy/SKILL.md) - Testing
  with env mocking
- [walkeros-writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards

---
name: walkeros-create-transformer
description:
  Use when creating a new walkerOS transformer to modify events in the pipeline
  (validate, enrich, or redact) at a before/next chain position. Example-driven
  workflow for the transformer interface, return values, and chaining.
---

# Create a New Transformer

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../walkeros-understanding-flow/SKILL.md) - How
  transformers fit in architecture
- [understanding-transformers](../walkeros-understanding-transformers/SKILL.md) -
  Transformer interface
- [understanding-events](../walkeros-understanding-events/SKILL.md) - Event
  structure
- [testing-strategy](../walkeros-testing-strategy/SKILL.md) - How to test
- [writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards (for Phase 7)

## Transformer Categories

| Category     | Purpose                       | Example                      |
| ------------ | ----------------------------- | ---------------------------- |
| **Validate** | Check event structure/content | JSON Schema, required fields |
| **Enrich**   | Add data to events            | Server timestamps, geo data  |
| **Redact**   | Remove/mask sensitive data    | Strip PII, anonymize IPs     |

## Process Overview

```
1. Research     → Understand use case (validate/enrich/redact)
2. Examples     → Create event before/after examples FIRST
3. Scaffold     → Copy template, configure package.json
4. Convention   → Add walkerOS.json metadata and buildDev
5. Implement    → Build transformer with TDD
6. Test         → Verify against example transformations
7. Document     → Write README
```

## Supporting Files

This skill includes reference files you can copy:

- **[templates/validation/](templates/validation/)** - Complete redact
  transformer template
  - [index.ts](templates/validation/index.ts) - Implementation with context
    pattern
  - [types.ts](templates/validation/types.ts) - Type definitions
  - [schemas.ts](templates/validation/schemas.ts) - Zod settings schema
  - [index.test.ts](templates/validation/index.test.ts) - Test suite with
    helpers, one test per step example
  - [conformance.test.ts](templates/validation/conformance.test.ts) - The
    conformance kit on a real collector
- **[examples/](examples/)** - The template's examples: `step.ts`, `events.ts`
  (which its unit tests read) and `config.ts` (sample configs)

Copy them into a package as Phase 3 lays it out: `index.ts` to
`src/transformer.ts`, `types.ts` to `src/types.ts`, `schemas.ts` to
`src/schemas/index.ts`, `index.test.ts` to `src/__tests__/stepExamples.test.ts`,
`conformance.test.ts` to `src/__tests__/` and `examples/` to `src/examples/`.

---

## Phase 1: Research

**Goal:** Understand what the transformer needs to do.

### 1.1 Define Use Case

- [ ] **Category**: Validate, Enrich, or Redact?
- [ ] **Input**: What events will this process?
- [ ] **Output**: What should change? What should be blocked?
- [ ] **Configuration**: What settings does user need?

### 1.2 Check Existing Patterns

```bash
# Reference implementation
ls packages/server/transformers/fingerprint/

# Transformer types
cat packages/core/src/types/transformer.ts
```

### Gate: Research Complete

- [ ] Category identified (validate/enrich/redact)
- [ ] Input/output transformation defined
- [ ] Configuration options listed

---

## Phase 2: Create Examples (BEFORE Implementation)

**Goal:** Define event transformations in `dev` entry FIRST.

### 2.1 Scaffold Directory Structure

```bash
mkdir -p packages/server/transformers/[name]/src/{examples,schemas}
```

### 2.2 Step Examples

Write one step example per case in `src/examples/step.ts`: events that pass
through (modified or not), the expected output after processing, and events that
are blocked (for validators). Each export is one `Flow.StepExample`:

```typescript
// examples/step.ts
import type { Flow } from '@walkeros/core';

export const orderPasses: Flow.StepExample = {
  title: 'Order passes',
  description: 'An order event passes through unchanged.',
  in: { name: 'order complete', data: { id: 'ORD-123' } },
  out: [
    ['return', { event: { name: 'order complete', data: { id: 'ORD-123' } } }],
  ],
};

export const debugFiltered: Flow.StepExample = {
  public: false,
  description: 'A debug event is dropped.',
  in: { name: 'debug test', data: { message: 'noise' } },
  out: [['return', false]], // the transformer drops this event
};
```

`in` is a walkerOS event; `out` is the `['return', value]` effect: the result
the transformer returns (`{ event }`), or `false` for an event it drops. A
failure example sets `outcome` instead (see Phase 6). Set `title` +
`description` for public examples; mark test-only fixtures with `public: false`.
`src/examples/index.ts` exports them with `export * as step from './step';`. See
[using-step-examples](../walkeros-using-step-examples/SKILL.md) for the Three
Type Zones.

### 2.3 Export via dev.ts

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Gate: Examples Valid

- [ ] All example files compile (`npm run build`)
- [ ] Can trace: input event → expected output for each example

---

## Phase 3: Scaffold

**Template transformer:** `packages/server/transformers/fingerprint/` (a server
transformer). A platform-neutral transformer lives in `packages/transformers/`
(for example `validate`, `ga4`).

```bash
cp -r packages/server/transformers/fingerprint packages/server/transformers/[name]
cd packages/server/transformers/[name]

# Update package.json: name, description, repository.directory
```

**Directory structure:**

```
packages/server/transformers/[name]/
├── src/
│   ├── index.ts           # Main export
│   ├── transformer.ts     # Transformer implementation
│   ├── types.ts           # Settings, Types interfaces
│   ├── dev.ts             # Exports schemas and examples
│   ├── examples/
│   │   ├── index.ts       # export * as step from './step'
│   │   └── step.ts        # Step examples
│   ├── schemas/
│   │   └── index.ts       # Zod schemas for settings
│   └── __tests__/         # stepExamples.test.ts, conformance.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
└── README.md
```

---

## Phase 4: walkerOS.json Convention

Every walkerOS package ships a `walkerOS.json` file for CDN-based schema
discovery.

### Add `walkerOS` field to package.json

```json
{
  "walkerOS": {
    "type": "transformer"
  },
  "keywords": ["walkerOS", "walkerOS-transformer", ...]
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

If your transformer has capabilities, behaviors, or troubleshooting patterns not
obvious from schemas alone, add hints. See `walkeros-writing-documentation`
skill for full guidelines.

Create `src/hints.ts`:

```typescript
import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'validation-behavior': {
    text: 'Describes how validation works. See settings schema for options.',
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
- Key naming: kebab-case, group with prefixes (validation-\*, enrichment-\*,
  troubleshoot-\*)
- Most transformers don't need hints; schemas and examples cover the common case

### Gate: Convention Met

- [ ] `walkerOS` field in package.json with `type: "transformer"`
- [ ] `buildDev()` in tsup.config.ts
- [ ] Build generates `dist/walkerOS.json`
- [ ] Keywords include `walkerOS` and `walkerOS-transformer`

### Runtime-only npm dependencies

A third-party npm dependency that **cannot be ESM-bundled** (uses `__dirname`,
ships a `.node` binary, etc.) needs no declaration: server bundles are traced
with nft, which copies every file the bundle reaches at runtime. Do not add a
`walkerOS.bundle` field to `package.json`: the CLI ignores it and warns
`still declares walkerOS.bundle.<keys>; this is ignored`. See
[walkeros-using-cli: server bundles use nft tracing](../walkeros-using-cli/SKILL.md#server-bundles-use-nft-tracing).

---

## Phase 5: Implement

**Now write code to transform examples as expected.**

### 5.1 Define Types

See [templates/validation/types.ts](templates/validation/types.ts) for the
pattern. Define `Settings` and `Types` interfaces.

### 5.2 Implement Transformer (Context Pattern)

Transformers use the **context pattern** - they receive a single `context`
object containing `config`, `env`, `logger`, `id`, and `collector`.

See [templates/validation/index.ts](templates/validation/index.ts) for a
complete implementation example.

**Key patterns:**

1. **Context destructuring**: Extract `config`, `logger`, `id` from init context
2. **Settings schema, defaults inline**: the Zod schema (see
   [templates/validation/schemas.ts](templates/validation/schemas.ts)) describes
   the settings for `walkeros validate`, `walkerOS.json` and the docs; the
   transformer applies its defaults inline and does not parse settings at
   runtime
3. **Push receives pushContext**: The `push` function gets event + push context
4. **Return values**: `{ event }` (continue), `void` (passthrough), `false`
   (cancel on purpose: a deliberate drop, not a failure; the push answers
   `ok: true`), or an array of results to fork the event (see
   [understanding-transformers](../walkeros-understanding-transformers/SKILL.md))
5. **A failure is a throw**: throw a `StepError` from `@walkeros/core` with a
   `code`. `missing-input` is the code for an event or an ingest that lacks the
   input the transformer needs (do not drop it silently); `config` for a missing
   setting. `init` throws instead of returning `false` or returning early, and a
   transformer never logs a failure itself: the collector turns the throw into
   `ok: false` with the transformer named and writes the one ERROR line. A
   transformer that throws a plain error fails with the code `transformer`.

### 5.3 Export

`src/index.ts`:

```typescript
export { transformerRedact } from './transformer';
export type { Settings, Types } from './types';
```

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run verify:touched -- <platform>-transformer-<name>` passes (L1:
      typecheck + lint + test; the argument is the package name after
      `@walkeros/`, `transformer-<name>` for a platform-neutral one)

---

## Phase 6: Test Against Examples

**Verify implementation produces expected outputs.**

See [templates/validation/index.test.ts](templates/validation/index.test.ts) for
a complete test suite showing:

1. **`createTransformerContext()` helper** - a typed init context for unit
   tests, defined in the test file
2. **`createPushContext()` helper** - the same for the push context
3. **Examples for test data** - Don't hardcode test values
4. **Return value testing** - Verify `event`, `void`, or `false` returns
5. **Conformance** - `conformance('transformer', transformer, options)` from
   `@walkeros/collector/dev` (profile `transformer`) runs it on a real
   collector, see
   `packages/server/transformers/fingerprint/src/__tests__/conformance.test.ts`.
   A transformer needs no `page`. A transformer whose input is the ingest and
   not an event declares its failure with a `missing-input` example (an event as
   `in`, `out: []`, an `outcome` and a description).

### Gate: Tests Pass

- [ ] `npm run verify:touched -- <platform>-transformer-<name>` passes (L1)
- [ ] Tests verify against example outputs

---

## Phase 7: Document

Follow the [writing-documentation](../walkeros-writing-documentation/SKILL.md)
skill for:

- README structure and templates
- Quality checklist before publishing

Key requirements for transformer documentation:

- [ ] Use case description (validate/enrich/redact)
- [ ] Configuration options table
- [ ] Working code example with imports
- [ ] Installation instructions
- [ ] Link to website docs

---

## Transformer-Specific Validation

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
- [ ] Examples include before/after event pairs
- [ ] Return values handle all cases (event, void, false)
- [ ] A failure is a thrown `StepError` (`missing-input` for absent input),
      `init` throws instead of returning `false`, conformance test passes
- [ ] Tests use examples for assertions (not hardcoded values)
- [ ] `walkerOS.json` generated at build time
- [ ] `walkerOS` field in package.json

---

## Reference Files

| What           | Where                                       |
| -------------- | ------------------------------------------- |
| Template       | `packages/server/transformers/fingerprint/` |
| Types          | `packages/core/src/types/transformer.ts`    |
| Chaining logic | `packages/collector/src/transformer.ts`     |

## Related Skills

- [walkeros-understanding-transformers](../walkeros-understanding-transformers/SKILL.md) -
  Transformer interface and chaining
- [walkeros-testing-strategy](../walkeros-testing-strategy/SKILL.md) - Testing
  patterns and env mocking
- [walkeros-writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Documentation standards

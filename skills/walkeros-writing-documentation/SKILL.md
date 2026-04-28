---
name: walkeros-writing-documentation
description:
  Use when writing or updating walkerOS documentation - README, website docs, or
  skills. Covers quality standards, example validation, and DRY patterns.
---

# Writing Documentation

## When to Use This Skill

- Creating a new package README
- Writing website documentation (MDX)
- Creating or updating skills
- Reviewing documentation for quality
- Documenting Phase 7 of create-destination or create-source

## Prerequisites

- [understanding-flow](../walkeros-understanding-flow/SKILL.md) - Architecture
  context
- [understanding-events](../walkeros-understanding-events/SKILL.md) - Event
  naming rules

---

## Documentation Types

### Where Content Belongs

| Type               | Purpose                                       | Audience                    |
| ------------------ | --------------------------------------------- | --------------------------- |
| **Package README** | Installation, basic usage, API reference      | Package users               |
| **Website docs**   | Guides, integration examples, detailed config | Integrators                 |
| **Skills**         | Process knowledge, workflows                  | AI assistants, contributors |

### Divio Documentation Types

Keep these separate - don't mix tutorials with reference:

| Type             | Purpose            | User State                    |
| ---------------- | ------------------ | ----------------------------- |
| **Tutorial**     | Learning           | Studying, beginner            |
| **How-To Guide** | Problem-solving    | Working, knows what they need |
| **Reference**    | Information lookup | Working, needs facts          |
| **Explanation**  | Understanding      | Studying, needs context       |

---

## Example Validation (CRITICAL)

### The Problem

AI-generated examples can be:

- Syntactically correct but use non-existent APIs
- Plausible-looking but don't match actual exports
- Outdated, referencing deprecated patterns

### Source of Truth Hierarchy

```text
TIER 1: apps/quickstart/
  ✓ Tested  ✓ Compiled  ✓ CI-validated
  → USE FOR: All code examples

TIER 2: packages/core/src/eventGenerator.ts
  ✓ Canonical events  ✓ Real data structures
  → USE FOR: Event examples

TIER 3: packages/*/src/index.ts exports
  ✓ Actual public API
  → USE FOR: Verifying API names exist

TIER 4: Package READMEs & Website docs
  ⚠ May contain errors
  → VERIFY against Tier 1-3 before trusting
```

### Validation Checklist

Before publishing ANY code example:

- [ ] **API exists?** Check `packages/*/src/index.ts` exports
- [ ] **Pattern validated?** Compare against `apps/quickstart/`
- [ ] **Events canonical?** Use patterns from `eventGenerator.ts`
- [ ] **Example compiles?** TypeScript check passes
- [ ] **Imports correct?** Package names match actual packages

### Red Flags

| Red Flag                               | What It Indicates                   |
| -------------------------------------- | ----------------------------------- |
| API name not in package exports        | Hallucinated or outdated API        |
| Import path doesn't match package.json | Wrong package reference             |
| Event name with underscore             | Wrong format (should be space)      |
| No imports shown                       | Context missing, harder to validate |

---

## DRY Patterns

### Configuration snippet (package pages)

**When to use:** Every package page for destinations, sources, transformers, and
stores. The `<Configuration>` snippet owns the `## Configuration`,
`## Settings`, `## Mapping`, and `## Examples` H2 sections. One callsite per
page, after `## Installation`.

```mdx
import data from '@walkeros/web-destination-gtag/walkerOS.json';
import Configuration from '@site/src/components/snippets/_configuration.mdx';

## Installation

<CodeSnippet
  code={`npm install @walkeros/web-destination-gtag`}
  language="bash"
/>

<Configuration type="destination" data={data} />
```

`type` must be one of `destination`, `source`, `transformer`, `store`. `data` is
the full `walkerOS.json` import. The snippet:

- emits `## Configuration` with a short pointer to the shared group-level
  configuration reference,
- emits `## Settings` using `<PropertyTable schema={data.schemas.settings} />`
  when the schema is present, otherwise a "no package-specific settings" note,
- emits `## Mapping` using `<PropertyTable schema={data.schemas.mapping} />`
  when present, otherwise a pointer to the standard rule fields,
- emits `## Examples` only if `data.examples.env.init` or `data.examples.step.*`
  is present; iterates `examples.step` and renders each through `<StepExample>`.

**Never** hand-roll `## Configuration`, `## Settings`, `## Mapping`, or
`## Examples` on a package page. Place package-specific content (vendor quirks,
advanced usage, platform-specific setup) BELOW the `<Configuration>` block with
its own sentence-case H2 heading. Fold `## Features` bullet lists into the intro
paragraph as prose — no `## Features` heading on package pages.

### Shared configuration reference (group index pages)

On group index pages (`docs/destinations/index.mdx`, `sources/index.mdx`,
`transformers/index.mdx`, `stores/index.mdx`), add a `## Configuration` section
that documents the wrapper fields around `settings` — fields shared across all
packages of that type (consent, mapping, env, id, …).

Drive the table from the core Zod schemas, filtering dev-only fields at the
representation layer:

```mdx
import { schemas } from '@walkeros/core/dev';
import { omitSchemaProperties } from '@site/src/utils/schema';

export const destinationConfig = omitSchemaProperties(
  schemas.DestinationSchemas.configJsonSchema,
  ['settings', 'init', 'mock', 'onError', 'onLog'],
);

## Configuration

<PropertyTable schema={destinationConfig} />
```

Available schemas:

- `schemas.DestinationSchemas.configJsonSchema`
- `schemas.SourceSchemas.configJsonSchema`
- `schemas.TransformerSchemas.configJsonSchema`
- `schemas.StoreSchemas.configJsonSchema`

Use `omitSchemaProperties` to hide `settings` (documented per-package) and any
dev-only fields (`init`, `mock`, `chainMocks`, `onError`, `onLog`) from the
user-facing table.

### Code display: CodeView vs CodeBox

`@walkeros/explorer` exports two components for code display:

- **`<CodeBox>`** renders Monaco, the full editor. Use when the user can edit
  the code (playgrounds, interactive demos). Ships the IDE.
- **`<CodeView>`** renders Shiki, read-only. Use for static code in docs,
  marketing pages, and anywhere editing is not a requirement. Same `<Box>` frame
  as `<CodeBox>` (traffic lights, header, copy button, tabs) so visuals match.
  Zero Monaco runtime cost.

Tokens match because Shiki uses the same TextMate grammars as VS Code / Monaco,
with the matching `dark-plus` / `light-plus` themes.

**Rule:** default to `<CodeView>`. Only reach for `<CodeBox>` when the code must
be editable.

### PropertyTable component

`<PropertyTable schema={...} />` from `@walkeros/explorer` is the primitive. It
renders a pure table — no heading, no captions. Never wrap it in a custom
heading on package pages; use the `<Settings />` snippet instead.

**When NOT to use:**

- Pages without package configuration
- Reference tables (Logger API, CLI commands)
- Conceptual explanations

### Schema Exports (dev.ts)

Every destination/source should export schemas:

```typescript
// src/dev.ts
export * as schemas from './schemas';
export * as examples from './examples';
```

### Don't Duplicate

- Link to source files instead of copying type definitions
- Reference `apps/quickstart/` examples instead of writing from scratch
- Use PropertyTable instead of hardcoded markdown tables

---

## Writing Hints (`src/hints.ts`)

Hints are the "experienced colleague" layer in `walkerOS.json` — they tell AI
agents _when_, _why_, and _what to watch out for_ beyond what schemas and
examples convey. Surfaced via MCP `package_get`. Not human-facing docs.

**Audience:** AI agents configuring packages on behalf of users.

### Core Principle: Expand Awareness, Don't Narrow It

Hints should open up the space of what's possible, not prescribe a single path.
An LLM reading hints should think "I have more options than I realized" — not "I
must follow these steps exactly."

### Writing Rules

| Rule                              | Do                                                            | Don't                                   |
| --------------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| **Describe capabilities**         | "Supports SA key, ADC, and custom client"                     | "Use a SA key file when outside GCP"    |
| **Reference schemas/examples**    | "See `settings.projectId` in the schema"                      | Repeat what the schema description says |
| **Explain why behind defaults**   | "Defaults to EU location; override via `location`"            | "Set location to US"                    |
| **Flag non-obvious interactions** | "When `snakeCase: true`, all data keys transform before send" | Describe obvious behavior               |
| **Symptoms → causes**             | "Empty table? Check projectId and dataset existence"          | Step-by-step fix instructions           |

### Key Naming

- **kebab-case**, group related hints with prefixes: `auth-*`, `storage-*`,
  `query-*`, `troubleshoot-*`
- Keep keys descriptive enough to scan: `auth-methods` not `a1`

### When to Add Hints

Most packages don't need hints — schemas and examples cover the common case. Add
hints when:

- Multiple auth or config strategies exist and it's non-obvious when to use
  which
- Non-obvious default behaviors need explaining
- Features interact in ways the schema can't express
- Prerequisites outside walkerOS are required
- Common troubleshooting patterns exist

### Accuracy Check

Before publishing hints, verify each claim is factually correct. Don't describe
features that aren't implemented. Don't assume behavior — confirm it.

### Quality Check

- [ ] Each hint expands awareness (describes capabilities, not prescriptions)
- [ ] Code snippets reference schema fields, not duplicate them
- [ ] No hint restates what a schema `.describe()` already says
- [ ] Troubleshooting hints use symptom → cause format
- [ ] Hints are atomic — one concept per hint
- [ ] Every claim is factually correct against current implementation

### Export Pattern

```typescript
// src/hints.ts
import type { Hints } from '@walkeros/core';

export const hints: Hints = {
  'auth-methods': {
    text: 'Supports three auth methods: ...',
    code: [{ lang: 'json', code: '{ "settings": { ... } }' }],
  },
};
```

```typescript
// src/dev.ts
export * as schemas from './schemas';
export * as examples from './examples';
export { hints } from './hints';
```

Note: `hints` is a direct export (not `* as`), because it's already a
`Record<string, Hint>`.

---

## Quality Checklist

### Structure

- [ ] Follows appropriate Divio type (Tutorial/How-To/Reference/Explanation)
- [ ] Code example within first 100 words
- [ ] First example under 20 lines
- [ ] Uses `<details>` for advanced content
- [ ] Has "Next Steps" or "Related" section

### Content

- [ ] All event names use `"entity action"` format with space
- [ ] Flow config shown as primary usage pattern
- [ ] Examples are complete and copy-pasteable
- [ ] Includes imports in code examples

### AI Readability

- [ ] Clear semantic headers (H2, H3, H4 hierarchy - no skipped levels)
- [ ] Tables for structured data
- [ ] Links to source of truth TypeScript files
- [ ] Static fallback content alongside dynamic components

### Consistency

- [ ] Uses standard table formats
- [ ] Follows package/skill/website templates
- [ ] Terminology matches: walkerOS, collector, destination, source
- [ ] Headings use sentence case (e.g., "Next steps" not "Next Steps")
- [ ] `walkerOS.json` convention followed (walkerOS field in package.json,
      buildDev in tsup)

---

## Templates

### Package README Template

````markdown
# @walkeros/[package-name]

[1-sentence description]

[Source Code](link) | [NPM](link) | [Documentation](link)

## Quick Start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "[sources|destinations]": {
        "[name]": {
          "package": "@walkeros/[package-name]",
          "config": { ... }
        }
      }
    }
  }
}
```
````

## Features

- **Feature 1**: Brief description
- **Feature 2**: Brief description

## Installation

```bash
npm install @walkeros/[package-name]
```

## Configuration Reference

| Name | Type | Description | Required | Default |
| ---- | ---- | ----------- | -------- | ------- |

## Examples

### Basic

[Simple example]

<details>
<summary>Advanced: Custom Mapping</summary>

[Complex example]

</details>

## Type Definitions

See [src/types.ts](./src/types.ts) for TypeScript interfaces.

## Related

- [Documentation](website/docs/...)

````

### walkerOS.json

Every package should document its `walkerOS.json` convention in the README:

```json
{
  "walkerOS": { "type": "destination", "platform": "web" }
}
```

The `walkerOS` field is an object with `type` and `platform` metadata describing
the package's role in the walkerOS ecosystem.

### Website Doc Template (MDX)

Website docs fold features into the intro paragraph (no `## Features` heading). READMEs keep `## Features` — this template is website-only.

```mdx
---
title: [Title]
description: [SEO description]
sidebar_position: [N]
---

import data from '@walkeros/[package]/walkerOS.json';
import Configuration from '@site/src/components/snippets/_configuration.mdx';

# [Title]

<PackageLink package="@walkeros/[package]" />

[1-sentence description that folds in key features as prose — no separate `## Features` heading on website docs.]

## Quick start

```json
// Flow config example (<15 lines)
````

## Installation

<CodeSnippet code={`npm install @walkeros/[package]`} language="bash" />

<Configuration type="destination" data={data} />

## Next steps

- [Related guide 1](/docs/...)

````mdx
---

## Priority Matrix

### Issue Classification

| Priority | Criteria | Action |
|----------|----------|--------|
| **P0 Critical** | Incorrect examples, wrong APIs, security issues | Fix immediately |
| **P1 High** | Missing PropertyTable, outdated domains, missing sections | Fix soon |
| **P2 Medium** | Inconsistent terminology, skipped headings | Plan to fix |
| **P3 Low** | Style issues, minor wording | Backlog |

---

## Non-Negotiables

### Punctuation

Never use em dashes (`—`). Use a comma, period, or rephrase the sentence
instead.

```text
CORRECT: "free and without sampling caps"
WRONG:   "free — without sampling caps"
```

### Event Naming

```text

CORRECT: "page view", "product add", "order complete" WRONG: "page_view",
"pageView", "PAGE VIEW"
```
````

### Package References

```text

CORRECT: `@walkeros/collector` (with backticks) WRONG: @walkeros/collector (no
backticks)

```

### Domain References

```text

CORRECT: `www.walkeros.io` or relative paths DO NOT USE: legacy domain
references

```

---

## Process

### For New Package Documentation

1. **Verify examples exist** in `apps/quickstart/` or create them first
2. **Write README** using template above
3. **Write website doc** using MDX template
4. **Run quality checklist**
5. **Verify all code examples** against Tier 1-3 sources

### For Documentation Updates

1. **Identify issue priority** using matrix above
2. **Check current state** against source of truth
3. **Make minimal changes** - don't over-engineer
4. **Verify examples still compile**
5. **Run quality checklist**

---

## Schema naming (`.meta({id, title})`)

Every exported schema in `packages/core/src/schemas/*.ts` (and in the `*Schema`
exports of destination / source / transformer / store packages) **must** carry
`.meta({ id, title, description })` so the generated JSON Schema links back to
the canonical TypeScript name. Without meta, the website's PropertyTable falls
back to `__schema0`, `object`, or `any`.

Convention:

- **id** — PascalCase, namespace-prefixed so it is globally unique across every
  schema in `packages/core/src/schemas`. Examples: `WalkerOSConsent`,
  `DestinationConfig`, `CollectorPushContext`, `LoggerConfig`.
- **title** — dotted form matching the VS Code TS hover: `WalkerOS.Consent`,
  `Destination.Config`, `Collector.PushContext`, `Logger.Config`.
- **description** — one short sentence. May repeat an existing `.describe()`
  where both are present.

Reference implementation (copy this shape for new schemas):

```ts
export const ConsentSchema = z.record(z.string(), z.boolean()).meta({
  id: 'WalkerOSConsent',
  title: 'WalkerOS.Consent',
  description: 'Consent state mapping (group name to granted state).',
});
```

Coverage is enforced by
`packages/core/src/schemas/__tests__/meta-coverage.test.ts`. When adding a new
schema, run that test — it will fail with the exact schema name if meta is
missing.

Destination / source / transformer / store packages that ship their own
`SettingsSchema` should also call `.meta({ id, title })` on it, e.g.
`DestinationGtag.Settings` / `GtagDestinationSettings`.

---

## Related Skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) - Data
  flow architecture
- [walkeros-understanding-events](../walkeros-understanding-events/SKILL.md) -
  Event structure and naming

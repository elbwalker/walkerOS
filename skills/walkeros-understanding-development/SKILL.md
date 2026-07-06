---
name: walkeros-understanding-development
description:
  Use when contributing to walkerOS, before writing code, or when unsure about
  project conventions. Covers build/test/lint workflow, XP principles, folder
  structure, and package usage.
---

# Understanding walkerOS Development

## Overview

walkerOS follows extreme programming principles with strict conventions. This
skill is your foundation before writing any code.

**Core principle:** DRY, KISS, YAGNI. Test first. Verify before claiming
complete.

## Commands

| Command          | Purpose                     |
| ---------------- | --------------------------- |
| `npm install`    | Install all dependencies    |
| `npm run dev`    | Watch mode for all packages |
| `npm run build`  | Build all packages          |
| `npm run format` | Prettier formatting         |

**Verification cheatsheet:**

- While iterating (L1, touched package): `npm run verify:touched -- <pkg>`
- At plan completion (L2, affected since `origin/main`):
  `npm run verify:affected`

See `/workspaces/developer/AGENT.md` rule 11 for the full doctrine.

## XP Principles (Non-Negotiable)

| Principle    | In Practice                                              |
| ------------ | -------------------------------------------------------- |
| **DRY**      | Use `@walkeros/core` utilities, don't reimplement        |
| **KISS**     | Minimal code to solve the problem                        |
| **YAGNI**    | Only implement what's requested                          |
| **TDD**      | Test first, watch it fail, then implement                |
| **No `any`** | Never use `any` in production code (tests are exception) |

## Folder Structure

```
packages/
├── core/           # Platform-agnostic types, utilities, schemas
├── collector/      # Central event processing engine
├── config/         # Shared config (eslint, jest, tsconfig, tsup)
├── web/
│   ├── core/       # Web-specific utilities
│   ├── sources/    # browser, dataLayer
│   └── destinations/ # gtag, meta, api, piwikpro, plausible
└── server/
    ├── core/       # Server-specific utilities
    ├── sources/    # gcp
    └── destinations/ # aws, gcp, meta

apps/
├── walkerjs/       # Ready-to-use browser bundle
├── quickstart/     # Code examples (source of truth for patterns)
└── demos/          # Demo applications
```

## Core Package Usage

**Always import from `@walkeros/core`:**

```typescript
// Types
import type { WalkerOS } from '@walkeros/core';

// Utilities
import {
  getEvent,
  createEvent, // Event creation
  getMappingEvent,
  getMappingValue, // Transformations
  isString,
  isObject,
  isDefined, // Type checking
  assign,
  clone, // Object operations
  tryCatch,
  tryCatchAsync, // Error handling
} from '@walkeros/core';
```

**Config package for shared tooling:**

- ESLint config: `@walkeros/config/eslint`
- Jest config: `@walkeros/config/jest`
- TSConfig: `@walkeros/config/tsconfig`
- Tsup config: `@walkeros/config/tsup`

## Editing core Config types

Core component configs live in two places:

- TS interface:
  `packages/core/src/types/{destination,source,transformer,store,collector}.ts`
- Zod schema:
  `packages/core/src/schemas/{destination,source,transformer,store,collector}.ts`

Both are hand-written and mirror each other. TS stays authoritative because
Zod's inferencer collapses recursive types (`Routes`, `MatchExpression`,
`Value`) to `unknown`. Zod drives runtime validation, JSON Schema emission, and
website Configuration reference tables.

When adding, renaming, or removing a Config field, update BOTH files. A
compile-time drift guard at
`packages/core/src/schemas/__tests__/config-drift.test-d.ts` fails `tsc` if the
key sets diverge. The guard checks keys only; value types may differ (recursion,
generic slots). Run `npm run verify:touched -- core` to verify.

## Error visibility contract

Top-level boundaries in the collector (`createPush` in `push.ts`,
`createCommand` in `command.ts`) wrap their inner pipeline in `tryCatchAsync`.
The `onError` callback MUST do two things:

- log a structured error via `collector.logger.error(message, { ... })` with
  enough context to reproduce (event/ingest for push, command/data for command),
- increment `collector.status.failed`.

An empty `onError` is a defect: it swallows the exception, returns
`{ ok: false }` silently, and leaves the operator blind. Use
`packages/collector/src/push.ts` and `packages/collector/src/command.ts` as the
canonical pattern.

Two categories of caught error:

1. **Internal walkerOS pipeline failures** (push, command, mapping outer wrap in
   `mapping.ts`, source factory / init / queueOn flush in `source.ts`,
   transformer init in `transformer.ts`, destination init in `destination.ts`):
   log AND `status.failed++`.
2. **User-supplied callbacks** (mapping `condition` / `fn` / `validate`, `on`
   subscriptions in `on.ts`): log only. `status.failed` stays a pipeline-health
   signal; user-code visibility goes via logs.

For invariant violations or operator-initiated aborts that must crash the host
process, throw `FatalError` (exported from `@walkeros/core`). `FatalError`
bypasses every boundary catch in both categories so a supervisor can terminate
cleanly. Standard `Error` is absorbed, logged, and (for category 1) counted.

The log message verb identifies the site: `'mapping condition failed'`,
`'source factory failed'`, `'transformer init failed'`, `'on callback failed'`,
etc. Operators grep for the verb. No `kind` field is required except in `on.ts`,
where seven sites share one verb and disambiguate via a typed `kind` field on
the structured payload.

## Testing

**REQUIRED SKILL:** Use `testing-strategy` for detailed testing patterns.

Quick reference:

- Use `env` pattern for mocking (not Jest mocks)
- Import from `dev.ts` for examples
- Test first, watch it fail
- Verify before claiming complete

## Related Skills

- [walkeros-testing-strategy](../walkeros-testing-strategy/SKILL.md) - Testing
  patterns and env mocking

**Source Files:**

- [packages/core/](../../packages/core/) - Core utilities
- [packages/config/](../../packages/config/) - Shared configuration
- [apps/quickstart/](../../apps/quickstart/) - Validated examples

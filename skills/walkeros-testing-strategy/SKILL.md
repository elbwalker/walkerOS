---
name: walkeros-testing-strategy
description:
  Use when writing tests, reviewing test code, or discussing testing approach
  for walkerOS packages. Covers env pattern, dev examples, and package-specific
  strategies.
---

# walkerOS Testing Strategy

## Overview

walkerOS uses a layered testing approach with built-in patterns for mocking and
documentation sync. This skill ensures tests are reliable, efficient, and
maintainable.

**Core principle:** Test real behavior using the `env` pattern, link to `dev`
examples, verify before claiming complete.

## The Rules

### Rule 1: Use `env` for Mocking, Not Jest

walkerOS has a built-in dependency injection pattern via `env` in context. This
is lighter than Jest mocks, enables documentation generation, and keeps tests in
sync with examples.

**Wrong:**

```typescript
jest.mock('../ga4', () => ({ initGA4: jest.fn() }));
expect(initGA4).toHaveBeenCalledWith(...);
```

**Right:**

```typescript
import { examples } from '../dev';
import { mockEnv } from '@walkeros/core';

const calls: Array<{ path: string[]; args: unknown[] }> = [];
const testEnv = mockEnv(examples.env.push, (path, args) => {
  calls.push({ path, args });
});

await destination.push(event, { ...context, env: testEnv });
expect(calls).toContainEqual({
  path: ['window', 'gtag'],
  args: ['event', 'page_view', { page_title: 'Home' }],
});
```

### Rule 2: Link Tests to `dev` Examples

The `dev.ts` export provides `examples.env` (the mock env and its `simulation`
paths) and `examples.step` (the step examples), plus `examples.minimal` for a
destination and `examples.createTrigger` for a source. Using these in tests
ensures documentation stays in sync.

#### Step Examples on a Real Collector

A destination's step examples run through `runExamples`, which starts a real
collector for each one and compares its `out` and `outcome`:

```typescript
import type { StandardEventName } from '@walkeros/core';
import { runExamples } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationMeta } from '..';
import { examples } from '../dev';

// The standard events the destination maps, each with a public example
const claims: StandardEventName[] = [
  'page view',
  'product view',
  'product add',
  'order complete',
];

// The init example takes a config as `in`, not an event
const { init, ...events } = examples.step;

it('runs the step examples', async () => {
  await runExamples('destination', destinationMeta, events, {
    settings: examples.minimal.settings,
    env: { push: examples.env.push, simulation: examples.env.simulation },
    page,
    claims,
  });
});
```

(`packages/web/destinations/meta/src/__tests__/conformance.test.ts` runs this
test.)

A source's step examples run one test per example with
`it.each(Object.entries(examples.step))`: the test feeds each example's
`trigger` and `in` through `examples.createTrigger` and compares what the source
hands the collector with `out` (see
`packages/server/sources/express/src/__tests__/stepExamples.test.ts`).

See [using-step-examples](../walkeros-using-step-examples/SKILL.md) for the full
lifecycle including the Three Type Zones and naming conventions.

### Rule 3: Test Real Behavior, Not Mock Behavior

If you're asserting that a mock was called, you're testing the mock works, not
the code.

**Red flags:**

- `expect(mockFn).toHaveBeenCalled()` without verifying the mock produces real
  effects
- Assertions on `*-mock` test IDs
- Tests that pass when mock is present, fail when removed

**Fix:** Test what the code actually does. If external APIs must be mocked,
verify the real API would receive correct data.

### Rule 3b: Prove Delivery, Loss and Failures on a Real Collector

A test or repro that claims an event was delivered, lost or reported as failed
starts a real collector with `startFlow` and mocks only the network or the
vendor global (through `env`), never `collector.push`. A suite that mocks the
collector cannot see loss: a destination that returns early, swallows an error
or forgets an `await` passes it. Assert on what a user sees at default settings:
the push result (`ok: false`, the destination under `failed` with its `reason`),
the status counters, or the ERROR line the collector wrote.

Failure paths are examples too. A step package's failure modes (a missing
required setting, a failing transport, a vendor script that is not loaded yet)
are `public: false` step examples with an `outcome` (and `respond` for a vendor
answer), not only the happy path. A `silent` rule and a consent revocation get
examples as well.

**Use the conformance kit.** `conformance(kind, step, options)` from
`@walkeros/collector/dev` runs a destination, source, transformer or store on a
real collector against its step examples and checks the failure contract in one
call. The `profile` states what the step talks to: for destinations `http`,
`sdk-env`, `web-sdk` (a web SDK started in `init`), `vendor-global` or `socket`;
`transformer` and `source` for those kinds. A web step passes `page` from
`@walkeros/web-core/dev`, the browser it runs on; the browser profiles fail
without it. A destination also passes `minimal: examples.minimal` (from
`src/examples/minimal.ts`, only the settings the schema requires or `init`
refuses to start without): the kit starts the destination with the settings its
docs quickstart shows and requires one public example delivered. A package that
cannot have a minimal example passes `withoutMinimal: '<reason>'` instead; with
neither, or with an option that disagrees with the file, the test fails.
`runExamples` runs the examples alone.

**Examples are the tests.** A destination's public examples (one per standard
event it maps, from `getEvent(name)`) are asserted by `runExamples` with
`claims`; do not restate an example's input and assertion in a second test.
Every example runs as published: each function as source text, revived outside
its module, the way `walkerOS.json` ships it (the runner reads that text from
the code the test run compiled, not from the built `dist/walkerOS.json`). A
condition that calls an imported helper therefore fails the test, as it would
fail in a user's flow. Keep the tests for boundaries, failures and ordering. An
example's `out` is a literal taken from the vendor's documented request, never
the output of the code under test, otherwise the test passes by construction.
See [using-step-examples](../walkeros-using-step-examples/SKILL.md).

### Rule 4: Test First, Watch It Fail

If you didn't see the test fail, you don't know it tests the right thing.

**Process:**

1. Write failing test
2. Verify it fails for expected reason (missing feature, not typo)
3. Write minimal code to pass
4. Verify it passes
5. Refactor if needed

**Red flags:**

- Test passes immediately when written
- Can't explain why test failed
- "I'll add tests later"

### Rule 5: No Test-Only Methods in Production Code

Production classes shouldn't have methods only tests use.

**Wrong:**

```typescript
class Session {
  destroy() {
    /* only used in tests */
  }
}
```

**Right:**

```typescript
// In test-utils/
export function cleanupSession(session: Session) { ... }
```

### Rule 6: Verify Before Claiming Complete

"Should pass now" is not verification.

**Process:**

1. Run the actual test command
2. Read the output
3. Confirm pass/fail count
4. Only then claim status

## When to Use Each Test Type

| Type            | When to Add                                                         | Example                                                        |
| --------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Integration** | New usage pattern, new external API interaction, new data flow path | Collector → Destination → gtag()                               |
| **Unit**        | Combinatorics, edge cases, pure function logic                      | Mapping variations, core utilities                             |
| **Contract**    | Boundary validation                                                 | Destination output matches vendor API, source input validation |

**Guideline:** Integration tests prove things work when stuck together. Unit
tests efficiently cover variations. Contract tests catch API drift.

## Simulation Testing

Simulation testing uses the CLI `push` command with `--simulate` flags. The
collector does not export a `simulate()` function: simulation is a CLI concern
that maps to `mock`/`disabled` config properties at runtime.

**CLI usage:**

```bash
# Simulate a destination (mocks its push, captures API calls)
walkeros push flow.json -e '{"name":"page view"}' --simulate destination.ga4

# Simulate a source (captures events it pushes, disables all destinations)
walkeros push flow.json -e '{"content":"","trigger":{"type":"load"}}' --simulate source.browser

# Mock a destination with a specific return value
walkeros push flow.json -e event.json --mock destination.ga4='{"status":"ok"}'
```

The event needs a `name`: a destination simulation of an event without one sends
nothing and still answers `success: true`
(`mapping: none (skipped before mapping)`, `no calls`), while a real push of it
answers `ok: false` with `Event name is required`.

**Programmatic usage:**

```typescript
import { simulateDestination, simulateSource } from '@walkeros/cli';

// Simulate a destination: returns one Simulation.Result
const dest = await simulateDestination(
  'flow.json',
  { name: 'page view' },
  { destinationId: 'ga4', ingest: { userAgent: 'Mozilla/5.0' } },
);
// dest.calls = recorded vendor calls ({ fn, args, ts })
// dest.mappingKey = matched rule, e.g. "page view"

// Simulate a source: input is { content, trigger? }
const src = await simulateSource(
  'flow.json',
  { content: { name: 'page view' } },
  { sourceId: 'browser' },
);
// src.events = events captured from source env.push
```

`simulateTransformer` and `simulateCollector` follow the same shape. The CLI
`push --simulate` path collects these results into `PushResult.simulations` and
prints them with `formatPushResult`; programmatic `push()` does not simulate.

**Key points:**

- `--simulate destination.X` starts only the target destination (no source, no
  other destination); the flow's transformers still start
- `--simulate source.X` starts only that source and captures its events at the
  collector boundary; they reach no destination. A source package declaring
  `examples.env.simulation` (SQS, Pub/Sub pull) runs on its mock client, calls
  recorded
- Simulate options: `--consent` (starting collector consent), `--command`
  (destination runs a collector command instead of a push), `--page-url` (web
  source page), `--ingest` (request context). Programmatic:
  `simulateDestination(config, event, { destinationId, consent, command })`,
  `simulateSource(config, input, { sourceId, pageUrl })`
- Destination `/dev` env.push is auto-loaded to provide mock globals (fake
  `window.gtag`, a mock SDK client, a mock `sendServer`), resolved per export
  (`exportExamples`). Without one, simulate refuses a package destination before
  the flow starts instead of calling the real vendor (an inline `code` step has
  no package and runs as given). A flow store's mock env is injected when its
  package ships one; a store without one runs for real.
- Returns `PushResult` with `simulations` (one `Simulation.Result` per simulated
  step: `events`, `calls`, `mappingKey?`, `skipped?`, `error?`; `skipped` says
  why a destination sent nothing: `pending` on its `require`, or a `consent`
  skip)
- Trace-mode limit: simulate injects the mock env before `init`, so a client
  built in `init` is recorded. Runtime trace mode wraps the env per push only
  (`collector/src/destination.ts`), so calls through a client built in `init`
  are not recorded there.
- The `mockEnv()` and env pattern examples above remain correct for unit testing
  individual step functions directly

## Package-Specific Approaches

| Package                 | Approach                                                                        |
| ----------------------- | ------------------------------------------------------------------------------- |
| **core**                | Unit tests only - pure functions, no env needed                                 |
| **collector**           | Integration tests critical - input/output consistency is paramount              |
| **browser source**      | Maintain walker algorithm coverage                                              |
| **web destinations**    | Integration tests per unique pattern + unit tests for mappings, use env pattern |
| **server destinations** | Same as web destinations                                                        |
| **cli/docker**          | Integration tests for spawn behavior, explore dev pattern to reduce duplication |
| **sources**             | Contract tests for input validation, integration tests for event capture        |

## The env Pattern Deep Dive

### How env Works

Each destination/source defines an `env` type that specifies external
dependencies:

```typescript
// Destination-specific env type
export interface Env extends DestinationWeb.Env {
  window: {
    gtag: Gtag.Gtag;
    dataLayer: unknown[];
  };
  document: {
    createElement: (tagName: string) => HTMLElement;
    head: { appendChild: (node: unknown) => void };
  };
}
```

### mockEnv() Function

The `mockEnv()` function from `@walkeros/core` creates a Proxy that intercepts
all function calls:

```typescript
import { mockEnv } from '@walkeros/core';

const calls: Array<{ path: string[]; args: unknown[] }> = [];
const testEnv = mockEnv(examples.env.push, (path, args) => {
  calls.push({ path, args });
  // Optionally return a value
});

// Now use testEnv in your destination context
await destination.push(event, { ...context, env: testEnv });

// Assert on captured calls
expect(calls).toContainEqual({
  path: ['window', 'gtag'],
  args: ['event', 'purchase', expect.objectContaining({ value: 99.99 })],
});
```

### Rules for a package's env

- **`init` keeps an injected dependency.** Every external dependency (SDK
  client, constructor or module, `fetch`, `sendServer`, auth client) is reached
  through `env`, and `init` creates one only when none is injected:
  `env?.x ?? (await createX(...))`. Overwriting an injected client means tests
  and simulate hit the real vendor.
- **Every mock env key is read.** Each key a package's `examples.env.push`
  declares must be read as `env.<key>` somewhere in the package's `src`;
  otherwise the mock is dead and the real module runs (jest may pass only
  through `__mocks__`).
- **`simulation` names the request call** and is pinned with
  `expectSimulationResolves(examples.env)` from `@walkeros/core/dev` (see
  [using-step-examples](../walkeros-using-step-examples/SKILL.md)).

### dev.ts Structure

Each package with external dependencies should have:

```typescript
// src/dev.ts
export * as schemas from './schemas';
export * as examples from './examples';

// src/examples/index.ts (a destination)
export * as env from './env';
export * as step from './step'; // Step examples { in, out }
export { minimal } from './minimal';
```

### Testing Sources with Injected env

Sources accept platform dependencies via `env`. Mock `window`, `document`, or
library imports by passing them through `env` instead of mocking globals.

Type the mock against the source's own `Env` type, not against the global
`Window`. A source that narrows `Env.window` to only the members it touches, as
the Cookiebot source does with `CookiebotWindow`, takes a mock of that shape
directly with **no `as unknown as Window` cast**:

```typescript
import type { Elb } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { CookiebotWindow, Types } from '../types';

// Instead of mocking the global window:
const mockWindow: CookiebotWindow = {
  Cookiebot: {
    consent: { marketing: true, method: 'explicit' },
    hasResponse: true,
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const elb: Elb.Fn = jest.fn();
const env: Types['env'] = {
  push: elb,
  command: elb,
  elb,
  window: mockWindow,
  logger: createMockLogger(),
};
```

This pattern avoids global state pollution between tests and enables simulation
in non-browser environments. Most sources type `Env.window` as the full
`Window & typeof globalThis`; the mock stays cast-free only when the source
narrows it to the members it uses (the same declare-global + narrowed-`Env`
approach destinations use, see
[create-destination](../walkeros-create-destination/SKILL.md), Phase 7, Key
Patterns 3). Server sources take their platform modules the same way
(`env.express ?? express`).

## Red Flags - Stop and Fix

- Using `jest.mock()` for internal modules when `env` pattern is available
- Tests that don't import from `../dev`
- Assertions only checking mock call counts
- Proving delivery or loss with a mocked `collector.push` instead of `startFlow`
- A destination without a conformance test, a `silent` example or a failure
  example, or a failure example without a `description`
- Tests with extensive mock setup (>50% of test is setup)
- Test-only methods added to production classes
- Claiming tests pass without running them

## Commands

Verification tiers (run from the repository root):

```bash
# L1, the default during a task: typecheck, lint, test for the touched package
npm run verify:touched -- core
npm run verify:touched -- web-destination-gtag

# L2, at plan completion: only packages affected since origin/main
git fetch origin main --depth=1
npm run verify:affected

# L3, before pushing or marking PR-ready: critical path + affected
npm run test:smoke

# Single test file (still useful while iterating)
cd packages/<name> && npm run test -- path/to/file.test.ts

# Watch mode (single package)
cd packages/<name> && npm run test -- --watch
```

Avoid bare `npm run test` at root inside per-task steps. That is L4 (full suite,
10-15 min) and is reserved for plan completion when the plan touched shared
infra, or for explicit user request.

## Reading a Step Back from the Collector

When a test calls a step's raw push directly through the collector bag
(`collector.sources.X.push`, `collector.destinations.X.push`, etc.), use the
typed accessors from `@walkeros/core` instead of casting:

```ts
import { Source } from '@walkeros/core';

const src = Source.getSource<TestSourceTypes>(collector, 'testSource');
await src.push({ method: 'GET', path: '/api/data' });
```

Available helpers: `Source.getSource`, `Destination.getDestination`,
`Transformer.getTransformer`, `Store.getStore`. Each accepts an optional type
parameter to recover the per-step generic that the bag's index signature erases
on read. Each throws `<Kind> not found: <id>` when the id is unknown.

Do not write `collector.sources.X.push as any` or
`collector.sources.X.push as (rawData: ...) => Promise<...>`. The accessor
exists exactly to remove that boundary cast.

## Shared Destination Test Harness

The conformance kit (`conformance` and `runExamples` from
`@walkeros/collector/dev`) is the shared harness for destination tests: the
failure contract, missing settings, the minimal example and every step example.

When writing a new destination test:

- Keep destination-specific behavior (vendor-specific batch shapes, ordering,
  edge cases the examples cannot state) in the test file.
- Mirror the shape of an existing destination of the same family (web vs
  server), for example `packages/web/destinations/meta/src/__tests__/` or
  `packages/server/destinations/pinterest/src/__tests__/`.
- Do NOT invent a new private harness inside the destination. If the kit does
  not cover a case, flag it.

## Related Skills

- [walkeros-understanding-development](../walkeros-understanding-development/SKILL.md) -
  Development conventions and workflow

**Reference:**

- [AGENT.md](../../AGENT.md) - Development guide

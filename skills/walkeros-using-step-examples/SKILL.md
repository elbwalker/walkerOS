---
name: walkeros-using-step-examples
description:
  Use when writing, simulating, validating, or testing with walkerOS step
  examples. Covers the complete lifecycle from authoring examples to CI
  integration.
---

# Using Step Examples

## Overview

Step examples are structured `{ in, out }` pairs (with optional `mapping` for
destinations) that define the expected input/output behavior of each step in a
flow. They serve as:

- **Test fixtures** for automated `it.each` testing
- **Simulation input** for `walkeros push --simulate` (pass an example's `in` as
  `--event`; the CLI does not compare the result against `out`)
- **MCP context** for AI-assisted development
- **Documentation** showing real-world usage

Every source, transformer, and destination can ship step examples alongside its
code.

## The Three Type Zones

Each step in a flow sits at a boundary between arbitrary external formats and
the walkerOS event model:

```
           Source              Transformer           Destination
  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
  │  in: arbitrary   │   │  in: walkerOS   │   │  in: walkerOS   │
  │  (HTTP req, DOM) │   │      Event      │   │      Event      │
  │        │         │   │        │         │   │        │         │
  │        ▼         │   │        ▼         │   │        ▼         │
  │  out: walkerOS   │   │  out: walkerOS  │   │  out: arbitrary  │
  │      Event       │   │   Event | false │   │  (gtag, API)     │
  └─────────────────┘   └─────────────────┘   └─────────────────┘

  arbitrary ──────────── walkerOS.Event ──────────── arbitrary
```

- **Source** converts platform-specific input into a walkerOS event
- **Transformer** receives and returns walkerOS events (or `false` to filter)
- **Destination** converts a walkerOS event into vendor-specific output

## The `in`/`out`/`trigger` Format

Every step example is an object with `in` (input), `out` (array of observable
effects), and optional `trigger` (how to invoke):

```typescript
type StepEffect = readonly [callable: string, ...args: unknown[]];
type StepOut = readonly StepEffect[];

interface StepExample {
  in?: unknown; // Platform-specific input
  out?: StepOut; // Array of effect tuples - see shape rules below
  trigger?: { type?: string; options?: unknown }; // How to invoke
  mapping?: unknown; // Destination mapping rule
  command?: 'config' | 'consent' | 'user' | 'run'; // Route to walker command
  // also: title, description, public (Metadata), outcome, respond (failures)
}
```

`out` is **always an array of effect tuples**, even for a single effect. Each
tuple is `[callable, ...args]`. The first element names the call, the remaining
elements are its arguments. `runExamples` compares the tuples exactly with the
calls it records, so the callable is the recorded path.

### Callable conventions

| Component type              | Callable                                                                         | Notes                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Destination with a mock env | `'window.gtag'`, `'window.fbq'`, `'window.dataLayer.push'`, `'window.ttq.track'` | The package's `simulation` path without `call:` (`'call:window.gtag'` records as `'window.gtag'`). Dotted paths render literally. |
| Destination (HTTP)          | `'fetch'`, `'sendServer'`                                                        | The request call the destination makes.                                                                                           |
| Source                      | `'elb'`                                                                          | The walker public push API.                                                                                                       |
| Transformer                 | `'return'`                                                                       | Reserved keyword. Renders as `return <value>` (no parens).                                                                        |

`'return'` is reserved. Don't use it for anything else.

Empty `out: []` means the step produced no observable effect (filtered input,
transformer passthrough, validator rejection). Reserved only for cases where the
destination/source deliberately emits nothing.

### Source Step Example - Server (Express)

`in` is an HTTP request shape, `out` is a tuple of the `elb()` call the source
makes:

```typescript
export const checkoutPost: Flow.StepExample = {
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    path: '/collect',
    body: { name: 'order complete', data: { id: 'ORD-123', value: 149.97 } },
  },
  out: [
    ['elb', { name: 'order complete', data: { id: 'ORD-123', value: 149.97 } }],
  ],
};
```

### Source Step Example - Commands (CMP, session)

A source that issues walker commands records them in its own call shape: the
first argument verbatim, callable `'elb'`. Commands come first, in call order,
then the events. A CMP source:

```typescript
out: [['elb', 'walker consent', { functional: true, marketing: true }]],
```

The session source (`env.command('user' | 'session', ...)`, then its event):

```typescript
out: [
  ['elb', 'user', { session: 's3ss10n-id', device: 'd3v1c3-id' }],
  ['elb', 'session', { id: 's3ss10n-id', isStart: true /* ... */ }],
  ['elb', { name: 'session start', data: { id: 's3ss10n-id' /* ... */ } }],
],
```

A source simulation (`walkeros push --simulate source.X`, MCP `flow_simulate`)
returns exactly these calls: `call elb("walker consent",{...})`. The collector's
own commands (starting consent from `--consent`, globals, custom, shutdown) and
the wiring commands `on`, `hook`, `destination` are never part of a source's
`out`. A consent-gated source needs `--consent` (MCP `state.consent`) to emit
anything.

### Source Step Example - Browser

`in` is an HTML string, `out` is a tuple of the `elb()` call:

```typescript
export const clickEvent: Flow.StepExample = {
  trigger: { type: 'click', options: 'button' },
  in: '<button data-elb="cta" data-elb-cta="label:Sign Up" data-elbaction="click:click">Sign Up</button>',
  out: [
    [
      'elb',
      {
        name: 'cta click',
        data: { label: 'Sign Up' },
        trigger: 'click',
        entity: 'cta',
        action: 'click',
        // plus context, globals, nested and source: an out lists every field
        // the step emits
      },
    ],
  ],
};
```

### Transformer Step Example

`in` is a walkerOS event, `out` is a `['return', value]` tuple with what the
transformer returns (`{ event }`, or `false` to drop). An empty array means the
transformer passed the event through unchanged:

```typescript
export const step = {
  orderPasses: {
    in: { name: 'order complete', data: { id: 'ORD-123' } },
    out: [
      [
        'return',
        { event: { name: 'order complete', data: { id: 'ORD-123' } } },
      ],
    ],
  },
  debugFiltered: {
    in: { name: 'debug test', data: { message: 'noise' } },
    out: [['return', false]], // Transformer rejects
  },
  passthrough: {
    in: { name: 'page view' },
    out: [], // No modification
  },
};
```

These outs are what the transformer itself returns, the shape a test that calls
`push` directly compares (see Transformer Tests below). `runExamples` instead
records what reaches the next step, the event as the collector completed it. A
dropped event is `out: []` there, and an event passed through unchanged is
`['return', { event }]` with every collector field.

### Destination Step Example

`in` is a walkerOS event, `mapping` is the mapping rule that transforms it,
`out` is an array of call tuples - one per observable effect the destination
produces. Multi-call events (e.g., GA4 + Ads + GTM for a single walker event)
flatten into a single array in execution order:

```typescript
import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

// getEvent pins the timestamp (1700000000000) and derives the id from the event
// name; pass `id` when the expected output must name a readable one.
export const purchase: Flow.StepExample = {
  in: getEvent('order complete', { id: '1700000000-gr0up-1' }),
  mapping: {
    name: 'Purchase',
    data: { map: { value: 'data.value', currency: { value: 'EUR' } } },
  },
  out: [
    [
      'window.fbq',
      'track',
      'Purchase',
      { value: 462, currency: 'EUR' },
      { eventID: '1700000000-gr0up-1' },
    ],
  ],
};
```

Multi-tool example (one walker event produces GA4, Ads, GTM in order):

```typescript
out: [
  ['window.gtag', 'event', 'purchase', { transaction_id: 'o1', value: 462 }],
  ['window.gtag', 'event', 'conversion', { send_to: 'AW-123', value: 462 }],
  ['window.dataLayer.push', { event: 'purchase', ecommerce: { ... } }],
],
```

Each export is a self-contained `Flow.StepExample` - no intermediate variables,
no `all` aggregation. The `mapping` field ties the mapping rule to the example
so tests can register it dynamically:
`{ [event.entity]: { [event.action]: example.mapping } }`.

Consumers iterate all examples via `Object.entries(examples.step)` -
`export * as step` exposes every named export directly.

### Command Step Example

Some destinations need to respond to walker commands (`walker consent`,
`walker user`, `walker run`), not events. Set the `command` field to route `in`
through `elb('walker <command>', in)` instead of pushing it as an event:

```typescript
export const consentGranted: Flow.StepExample = {
  command: 'consent',
  in: { marketing: true, analytics: true },
  out: [
    [
      'window.gtag',
      'consent',
      'update',
      {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
      },
    ],
  ],
};
```

Supported commands: `config`, `consent`, `user`, `run`.

- When `command` is absent (default), `in` is pushed as a regular event via
  `elb(in)`.
- When `command` is set, `mapping` is **not** applied - commands don't flow
  through event mapping.
- The `out` holds the calls the destination makes for the command, as tuples
  like any other `out`. The gtag example above runs with `config.consent` set;
  without it a `['window.gtag', 'consent', 'default', {...}]` call comes first,
  as in the gtag package's `consentModeV2` example.
- Simulate a command example with `--command <name>` (MCP: `command`): the
  destination simulation runs `collector.command(name, in)` instead of a push
  and records the calls it makes. Add `--consent` when the destination needs
  starting consent; it applies first, then the command:

  ```bash
  walkeros push flow.json -e '{"functional":true,"marketing":true}' \
    --simulate destination.ga4 --command consent
  ```

### Failure Step Example (`outcome`, `respond`)

A step's failure modes are examples too. A failure fixture is `public: false`
and declares what the push result reports through `outcome`; `respond` states
what the vendor's boundary answers when the failure comes from a response:

```typescript
export const rejectedByVendor: Flow.StepExample = {
  public: false,
  description: 'The vendor answers 200 and reports the event as failed.',
  in: getEvent('page view'),
  respond: { status: 200, body: { events: [{ status: 'failed' }] } },
  outcome: { status: 'failed', code: 'transport', retryable: false },
};

export const missingInput: Flow.StepExample = {
  public: false,
  description:
    'An event with nothing to send fails instead of counting as delivered.',
  in: getEvent('page view'),
  out: [],
  outcome: { status: 'failed', code: 'missing-input' },
};
```

- `outcome` is `{ status: 'failed' | 'queued', code, retryable? }`. Absent means
  the step must not fail. The codes are the collector's failure codes (`config`,
  `missing-input`, `transport`, `timeout`, `vendor-not-loaded`, ...).
- Every example with an `outcome` needs a `description`: the package's docs page
  lists it under "When it fails" (title, `description`, `status` and `code`,
  never its `in`), public or not, and the docs build fails on one without a
  `description`.
- `respond` is `{ status?, body?, error?: 'network' | 'timeout' }`.
- A step with no vendor call for an example has `out: []`. A `silent` rule is an
  example with `mapping: { silent: true }` and `out: []`, and a deliberate skip
  (`ignore: true`) is `out: []` with no `outcome`.
- `runExamples(kind, step, examples, options?)` and
  `conformance(kind, step, options)` from `@walkeros/collector/dev` run the
  examples on a real collector and compare the push result with `outcome`.
  Conformance profiles: destinations `http`, `sdk-env`, `web-sdk`,
  `vendor-global`, `socket`; `transformer` and `source` for the other kinds. The
  browser profiles (`web-sdk`, `vendor-global`) need `page` from
  `@walkeros/web-core/dev` in the options, and a web source may pass it;
  `runExamples` takes the same option.

### Public examples, `claims` and literal outs

A destination has exactly one public example per standard event it maps: the
most complete, fully implemented case. Its `in` starts from `getEvent(name)`
(`page view`, `product view`, `product add`, `order complete`). Edge cases,
other tools and failures are `public: false`; they still run as tests.

- **`claims`.** `runExamples('destination', step, examples, { claims })` takes
  the standard events the destination maps. It fails when a claimed event has no
  public example, when that example does not start from `getEvent(name)`, or
  when a public event example is not claimed. Init examples (config as `in`) are
  not events and are ignored by `claims`.
- **Mappings run through the real destination config.** The runner looks the
  example up by event name and applies `example.mapping ?? config.mapping`. A
  public example whose setup needs other settings runs in its own `runExamples`
  call with those `settings`.
- **Every example runs as published.** `runExamples` and `conformance` run every
  function in an example (in `in`, `mapping`, `trigger.options`, `respond.body`)
  the way `walkerOS.json` publishes it: as source text, revived outside the
  module it was written in. There is no option to turn this off. A condition
  that calls an imported helper passes as written and fails here
  (`example <name>: published code fails: ... is not defined`), which is how it
  would fail in a user's flow: a published function may use only its parameters
  and standard globals. The text revived is the one the test run compiled, not
  the one in the built `dist/walkerOS.json`, so a change only the package build
  makes is not covered.
- **An `out` is a literal.** Write it from the vendor's documented request (or a
  captured one), cite the source in the example, and only then run the code.
  Never compute an `out` with production code (a helper from `src/`, the
  destination's own encoder): the example would then agree with the code by
  construction. A mismatch between research and code is a finding; fix the
  product or the example and say why.
- **No personal data or credentials** in an example: placeholders
  (`G-XXXXXXXXXX`), `example.com` addresses and RFC 5737 IPs (`192.0.2.1`).

```typescript
import type { StandardEventName } from '@walkeros/core';
import { runExamples } from '@walkeros/collector/dev';

const CLAIMS: StandardEventName[] = [
  'page view',
  'product view',
  'product add',
  'order complete',
];

it('maps the claimed standard events', async () => {
  await runExamples('destination', destinationX, events, {
    settings,
    env,
    claims: CLAIMS,
  });
});
```

### Minimal example (destinations)

A destination package ships `examples.minimal`, a `Flow.MinimalExample` in
`src/examples/minimal.ts` (the path is `MINIMAL_EXAMPLE_FILE` on
`@walkeros/core/dev`), re-exported from `src/examples/index.ts`. It holds only
the settings the settings schema requires, plus any that `init` refuses to start
without. `composeQuickstart` (on `@walkeros/core/dev`) turns it into the install
line, the integrated code and the `flow.json` that the package's docs page
renders under `## Installation`, and the conformance kit starts the destination
with exactly those settings and requires one public success example to be
delivered.

```typescript
// src/examples/minimal.ts
import type { Flow } from '@walkeros/core';

export const minimal: Flow.MinimalExample = {
  settings: { accessToken: 's3cr3t', pixelId: '1234567890' },
  secrets: { accessToken: 'META_ACCESS_TOKEN' },
};

// src/examples/index.ts
export * as env from './env';
export * as step from './step';
export { minimal } from './minimal';
```

- **`settings`**: required keys only, placeholder values. An optional key stays
  in the examples that need it; the kit rejects a top-level key the schema does
  not require, unless `init` refuses to start without it.
- **`secrets`** (server only): a credential setting mapped to its secret name,
  `<VENDOR>_<SETTING>` in `A-Z`, `0-9` and `_`. Generated code reads
  `process.env.<NAME>` (integrated) and `$secret.<NAME>` (flow) and never shows
  the placeholder. `secrets` on a web destination throws.
- **`config`**: only `{ loadScript: true }`, for a web destination that loads
  its vendor script only when asked to. The kit fails a script-loaded web
  destination whose minimal example lacks it.
- **Several exports**: one minimal example per export, in the export's folder
  (`src/firehose/examples/minimal.ts`) and its `exportExamples` entry; the test
  passes `exportName` and `exportExamples`, the page
  `<Quickstart data={data} export="destinationFirehose" />`.

Every destination conformance test passes one of two options:

```typescript
await conformance('destination', destinationMeta, {
  profile: 'http',
  examples: examples.step,
  schema: schemas.settings,
  settings: examples.minimal.settings,
  minimal: examples.minimal,
  root: path.join(__dirname, '..', '..'),
});

// A package that cannot have one passes the reason instead of `minimal`, and
// its docs page keeps a hand-written setup:
//   withoutMinimal: 'the install line cannot express the driver choice',
```

A test with neither fails, and so does one that disagrees with the file:
`withoutMinimal` while `src/examples/minimal.ts` exists, `minimal` without it,
both, or a blank reason. The doc-lint (`npm run validate:docs`) fails a page
whose package has the file but whose `## Installation` shows a hand-written
`npm install`, `startFlow(` or bundled tab, or no `<Quickstart>`.

## Writing Examples

### Best Practices

1. **Use camelCase names** -- descriptive of the scenario (`checkoutPost`,
   `debugFiltered`, `pageViewBasic`)
2. **Cover happy path and edge cases** -- include at least one positive and one
   negative case for transformers
3. **Use realistic data** -- real-looking event names, IDs, and values
4. **Keep examples minimal** -- in `in`, only include fields relevant to the
   step's logic; omit empty/default-value fields (`context: {}`, `nested: []`,
   `user: {}`, etc.). An `out` is compared exactly, so it lists every field the
   step emits, empty ones included
5. **Export from `examples/step.ts`** -- follow the existing `dev.ts` structure
6. **Title and describe public examples** -- add `title` (2-5 words) and
   `description` (one short sentence, 10-25 words) for every example that should
   appear in docs. Mark test-only fixtures with `public: false`.

### File Structure

```typescript
// src/examples/step.ts - only Flow.StepExample exports, nothing else
import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', { id: '1700000000-gr0up-1' }),
  mapping: { name: 'Purchase', data: { map: { value: 'data.value' } } },
  out: [
    [
      'window.fbq',
      'track',
      'Purchase',
      { value: 462 },
      { eventID: '1700000000-gr0up-1' },
    ],
  ],
};

// src/examples/index.ts
export * as env from './env';
export * as step from './step';
```

The file exports **only** `Flow.StepExample` objects. No intermediate variables,
no `all`, no `config`. Consumers iterate via `Object.entries(examples.step)`.

### Rule: examples live only on the `./dev` subpath

Examples (and schemas) must be exported **only** from `src/dev.ts` (the `./dev`
package subpath), never from a production entry (`src/index.ts` / the package
main). Production bundles tree-shake on the import path: if `examples` is
reachable from the main entry, the bundler inlines every example (and its
`getEvent` fixtures) into the shipped JS, bloating consumer bundles with
test-only data. Importing them from `./dev` keeps them available for simulation
and testing while leaving production output clean.

A `no-restricted-syntax` ESLint rule enforces this, so a `export ... examples`
from a production entry fails lint.

### Multi-export packages: `exportExamples` and `exportSchemas`

A package whose `package.json` `walkerOS.exports` lists more than one export
adds a map of EVERY export, the default included, to `src/dev.ts`:

```typescript
export const exportExamples = {
  destinationBigQuery: bigqueryExamples,
  destinationPubSub: pubsubExamples,
};
```

The step's export name comes from `resolveExportName` (exported from
`@walkeros/cli`): the step's `import`, else `bundle.packages[pkg].imports[0]`,
else the default. The bundler runs only the step's `import` or the default
export, so set `import` on the step for examples and code to agree. When the
module has the map, `map[exportName]` is used and a missing name resolves to
nothing (never a fallback to `examples`); without a map, `examples` is used.
`selectDevExamples(devModule, exportName)` implements this. The CLI simulate,
MCP `flow_examples` and `package_get`, core `cdn.ts` and the tsup
`walkerOS.json` (`exportExamples` key) all follow it. Existing named exports
(`pubsubExamples`, `sqsExamples`, ...) stay for back compat.

The same package also exports `exportSchemas`, every export to that export's
schemas in the shape of a single-export `schemas` (`settings` required,
`mapping`, `setup` where they exist). Reuse the very objects behind
`schemas.settings` for the default entry, so a `toBe` test pins it:

```typescript
export const exportSchemas = {
  destinationBigQuery: {
    settings: bigquerySchemas.settings,
    mapping: bigquerySchemas.mapping,
  },
  destinationPubSub: {
    settings: pubsubSchemas.settings,
    mapping: pubsubSchemas.mapping,
    setup: pubsubSchemas.setup,
  },
};
```

`walkeros validate` and MCP `package_get` pick the entry for the step's export
with the same rule. The tsup build (`buildDev`) fails when either map does not
list exactly the `walkerOS.exports` names, when an `exportSchemas` entry has no
`settings`, and when any source, transformer, destination or store package
publishes no `schemas.settings` (a package without settings publishes
`z.object({})`). Prefixed keys in `schemas` (`pubsubSettings`, ...) stay.

### Mock env and `simulation` paths

`src/examples/env.ts` exports `push` (the mock env simulate injects) and
`simulation` (the call paths to record). Simulate refuses a package destination
whose export has no `push` mock ("No mock env for ..."), so it never calls the
real vendor.

- A `simulation` path names the call that CARRIES the vendor request
  (`sendServer`, `fetch`, `call:PubSub.topic.publishMessage`,
  `call:JSONWriter.appendRows`, `call:AWS.SNSClient.send`,
  `call:fs.createWriteStream.write`), never only a constructor.
- **`init` is not the request.** Do not record an `init` call (it carries the
  API key and sends nothing); a path may pass THROUGH init's result
  (`call:Mixpanel.init.track`). Amplitude and Mixpanel record their tracking
  calls, not `init`.
- Grammar (`parseCallPath`, shared by the recorder): an optional `call:` prefix,
  then `.`-separated segments; an empty segment makes the path unresolvable. The
  one recorder is `observeEnv(env, paths)` in `@walkeros/core` (collector
  `wrapEnv` and web-core `getEnv` delegate to it). It returns a Proxy view;
  nothing on the env objects or prototypes is mutated.
- Mid-path resolution: on an object, a segment is looked up as a property. After
  a function, a segment is the function's own property or a parent class's
  static; anything else (including `call`, `bind`, `name`, `length`) navigates
  the call result (or the constructed instance, for `new`). Frozen objects and
  frozen call results are recorded through a view; only a static on a frozen
  function stays unresolved. A mid-path Promise (async factory) is followed with
  `.then`. Only the leaf call is recorded: `fn` is the path without `call:`,
  `args` the leaf call's arguments. `instanceof`, statics and `#private` fields
  keep working, and a chain returning `this` records once.
- Pin every list in the package tests with the async
  `expectSimulationResolves(examples.env)` from `@walkeros/core/dev`: it walks
  each path through the `push` mock (constructing, calling, awaiting) and fails
  on a missing segment or a non-function leaf.

  ```typescript
  import { expectSimulationResolves } from '@walkeros/core/dev';
  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
  ```

- Not recordable: anonymous values such as SQLite prepared-statement rows.
- Sources: a source package that declares `simulation` runs on its mock client
  in a source simulation, and those calls are recorded. SQS records
  `call:AWS.SQSClient.send` (one receive per 100 ms while running); Pub/Sub pull
  records `call:PubSub.subscription` (messages arrive as events). Their
  module-mock tests import `moduleMockEnv`, the same env without the client.

## Metadata: title, description, public

Every `Flow.StepExample` accepts three optional metadata fields that control how
it surfaces in docs and MCP output:

- **`title?: string`** - overrides the default camelCase-to-spaced heading in
  website docs. Keep it short (2-5 words), human-readable.
- **`description?: string`** - one short sentence (10-25 words) rendered above
  each example in docs and surfaced in MCP `flow_examples` output. Explains what
  the example demonstrates, not how.
- **`public?: boolean`** - defaults to `true`. When `false`, the example is
  excluded from the Examples section of the website docs and from default MCP
  `flow_examples` output. It still runs in tests and remains callable via
  CLI/MCP `flow_simulate`. An example with `outcome` is listed under "When it
  fails" on the package page either way, so it needs a `description`.

```typescript
export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order mapped to the Meta Pixel Purchase standard event.',
  in: getEvent('order complete', { id: '1700000000-gr0up-1' }),
  mapping: {
    name: 'Purchase',
    data: { map: { value: 'data.value', currency: { value: 'EUR' } } },
  },
  out: [
    [
      'window.fbq',
      'track',
      'Purchase',
      { value: 462, currency: 'EUR' },
      { eventID: '1700000000-gr0up-1' },
    ],
  ],
};

// Internal fixture - runs in tests, hidden from docs and default MCP output.
export const debugFiltered: Flow.StepExample = {
  public: false,
  in: { name: 'debug test', data: { message: 'noise' } },
  out: [['return', false]],
};
```

### When to mark `public: false`

**Mark `public: false` when:**

- The example is a transformer rejection (`out: [['return', false]]`) that only
  proves filtering works.
- It's an error-path or malformed-input case.
- It's a redundant variant kept only for regression coverage.
- It's an internal fixture used by cross-package tests.

**Keep public (omit the field) when:**

- It's the happy path.
- It teaches a distinct mapping or usage pattern.
- It's the only example for some entity/action the package handles.

## Source Trigger Metadata

Source step examples can include a `trigger` field for simulation:

```typescript
{
  in: '<button data-elb="cta" data-elb-cta="label:Sign Up" data-elbaction="click">Sign Up</button>',
  trigger: { type: 'click', options: 'button' }, // a click needs its selector
  out: [['elb', { name: 'cta click', data: { label: 'Sign Up' } /* ... */ }]],
}
```

When simulating via CLI or MCP, the step example maps to `SourceInput`:

- `in` -> `content` (the actual source input)
- `trigger` -> `trigger` (which mechanism to fire)

Destination and transformer examples don't use `trigger`.

## Simulating with Step Examples

Use `--simulate <kind>.<name>` to target a specific step, then provide the input
with `--event`. For a source step, that is `SourceInput`
(`{ content, trigger? }`):

```bash
# Simulate a source step with trigger metadata (a click needs its selector)
walkeros push flow.json --simulate source.browser --event '{"content":"<button data-elb=\"cta\" data-elbaction=\"click\">Sign up</button>","trigger":{"type":"click","options":"button"}}'
```

The CLI does not compare the result against `out`. For each simulated step it
prints the matched mapping key and every recorded call (`--json`: under
`simulations`), and exits 1 only when the push fails with an error; a mapping
that produces the wrong output still exits 0. Assert on `out` in your own tests
(see Testing with Examples below). Add `--ingest` to give a transformer,
collector or destination step a request context, `--consent` for the collector
consent it starts from, `--command` for a command example, and `--page-url` for
the page of a web source (default: the trigger's `options.url`, else
`http://localhost`). See [using-cli](../walkeros-using-cli/SKILL.md).

The MCP `flow_examples` tool returns `trigger` metadata alongside `in`/`out`,
and `mapping` for destination examples, giving full visibility into how input
events are transformed to vendor-specific output.

## Validating Examples

Cross-step example validation is included automatically when validating a flow.
It does not run any step:

```bash
# Validate flow config including step example compatibility
walkeros validate flow.json
```

For steps connected through `next` or a destination's `before` chain, flow
validation checks that:

- At least one upstream `out` is structurally compatible with a downstream `in`:
  same type; two objects share at least half of the keys of the object with
  fewer keys; any two arrays are compatible regardless of content. No compatible
  pair is an error. This is a shape check, not an equality check.
- A connection is only checked when both steps declare `examples`; a step
  without an `examples` key produces no warning.
- When both steps declare `examples` but one side has no usable value, the
  connection produces a warning. An upstream `out` counts when it passes on at
  least one event (next bullet); a downstream `in` counts unless its example
  sets `command`.
- An `out` passes on the events of its effects: `elb` gives `args[0]` when it is
  an object; `return` gives `a.event` for `{ event }`, `a` for a bare event,
  each item for an array (fan-out); `false`, `message.ack`, `message.nack`,
  `response`, `respond` and vendor calls give nothing.
- Contracts bind only where a `@walkeros/transformer-validate` step links them,
  as at runtime. Each validate step's own examples run through that step's
  resolved `settings.contract`, `mode`, `format` and `output`, and the verdict
  must agree with its `out` (valid: passed on; invalid: `["return", false]` in
  `strict`, passed on with the `isValid` flag false in `pass`). A disagreement
  is `CONTRACT_VIOLATION` (warning, error with `--strict`). No other example is
  checked against the config-level `contract` block, and a flow without a
  validate step gets no contract checks.

## Testing with Examples

The primary use of step examples is automated testing with `it.each`.

### Source Tests (createTrigger)

Sources export `createTrigger` from their examples. It follows the unified
`Trigger.CreateFn` interface: receives `Collector.InitConfig`, lazily starts the
flow, and returns a trigger function that simulates real-world invocations.

Each package implements createTrigger differently:

- **Browser:** Injects HTML into DOM, starts flow, dispatches native events
- **Express:** Boots real HTTP server, sends `fetch()` requests

`runExamples` feeds each example's `in` through the package's `createTrigger`
and compares the `elb` calls the source makes with `out`:

```typescript
import { runExamples } from '@walkeros/collector/dev';
import { sourceExpress } from '@walkeros/server-source-express';
import { examples } from '@walkeros/server-source-express/dev';

it('runs the step examples', async () => {
  await runExamples('source', sourceExpress, examples.step, {
    createTrigger: examples.createTrigger,
    settings: { port: 0 },
  });
});
```

The run passes, but today the option is typed for `unknown` content, so `tsc`
rejects a package's typed `createTrigger` here (`TS2769`). The express package's
own `src/__tests__/stepExamples.test.ts` shows a typed loop that narrows `in`
with a type guard instead.

**Browser source note:** The browser source's elbLayer processes events via a
detached promise chain (fire-and-forget). A test that collects events with its
own spy destination after an interactive trigger (click, submit) polls until
they arrive:

```typescript
while (!events.length) await Promise.resolve();
```

### CMP Source Tests (Consent Assertion)

CMP sources push `walker consent` commands, not regular events. Assert on
collector consent state instead of using a spy destination:

```typescript
const instance = await examples.createTrigger({
  consent: {},
  sources: {
    usercentrics: {
      code: sourceUsercentrics,
      config: { settings: {} },
    },
  },
});

await instance.trigger(
  example.trigger?.type,
  example.trigger?.options,
)(example.in);

// Yield for the detached elb('walker consent') chain
await new Promise((resolve) => setTimeout(resolve, 20));

// out is [['elb', 'walker consent', consent]]
expect(instance.flow?.collector.consent).toEqual(example.out?.[0]?.[2] ?? {});
```

### Server Function Handler Tests (collector.sources)

Server function handlers (fetch, AWS Lambda, GCP CloudFunction) don't own
servers. Their `createTrigger` accesses the source instance from
`collector.sources` after `startFlow` and calls `source.push()` with
platform-native types:

```typescript
function findSource(collector) {
  for (const source of Object.values(collector.sources || {})) {
    if (source.type === 'fetch') return source;
  }
}

// In trigger:
const source = findSource(flow.collector);
const response = await source.push(request);
```

### Destination Functional Tests

For destinations, `runExamples('destination', ...)` (shown under Public examples
above) is the test: it starts a real collector, applies each example's `mapping`
through the destination config, records the calls named by
`examples.env.simulation`, and compares them with `out`. Pass the package's
`env` (`{ push, simulation }`), the `settings`, and for a web destination `page`
from `@walkeros/web-core/dev` (run in a jsdom test environment).

### Transformer Tests

A test that calls the transformer's `push` directly wraps its return in the
`out` shape (`runExamples('transformer', ...)` records what reaches the next
step instead, see Transformer Step Example):

```typescript
import type { WalkerOS } from '@walkeros/core';
import { createMockContext } from '@walkeros/core';
import { transformerMyTransformer } from '../transformer';
import { examples } from '../dev';

describe('transformer', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const instance = await transformerMyTransformer(
      createMockContext({ id: 'myTransformer' }),
    );
    const result = await instance.push(
      example.in as WalkerOS.DeepPartialEvent,
      createMockContext({ id: 'myTransformer' }),
    );
    const actual =
      result === false
        ? [['return', false]]
        : result
          ? [['return', result]]
          : [];
    expect(actual).toEqual(example.out);
  });
});
```

## Checklist

When adding step examples to a package or flow:

- [ ] Create `src/examples/step.ts` with `Flow.StepExample` exports
- [ ] Export from `src/examples/index.ts`
- [ ] Use camelCase, descriptive example names
- [ ] Include at least one happy-path example
- [ ] For transformers, include a `false` (filtered) case
- [ ] Add `it.each` test using step examples
- [ ] Exactly one public example per standard event the destination maps, from
      `getEvent(name)`, with `claims` in a `runExamples` call; every `out` a
      literal written from the vendor's documentation
- [ ] Failure examples (`public: false`, `outcome`, `respond`, a `description`)
      for every event the step cannot send, a `silent` example for a
      destination, and a conformance test (`conformance` from
      `@walkeros/collector/dev`)
- [ ] Destination: `src/examples/minimal.ts` with only the settings the schema
      requires or `init` refuses to start without (credentials as `secrets` on a
      server destination, `config.loadScript` for a script-loaded web
      destination), exported as `examples.minimal` and passed to `conformance`
      as `minimal`; or `withoutMinimal: '<reason>'`
- [ ] Verify examples compile: `npm run build`
- [ ] Run tests: `npm run verify:touched -- <pkg>` (L1)
- [ ] Add `title` and `description` to every public example.
- [ ] Mark internal/test-only examples with `public: false`.
- [ ] `examples/env.ts` exports `push` and a `simulation` list naming the
      request call, pinned with `expectSimulationResolves(examples.env)`.
- [ ] Multi-export package: `exportExamples` and `exportSchemas` in `dev.ts`
      list every export (the build fails otherwise).
- [ ] In a flow file, add examples sparingly: they are mainly internal and for
      demos (for example a client flow's source with `public: false` examples
      showing its default behaviour).

## Related Skills

- [testing-strategy](../walkeros-testing-strategy/SKILL.md) - Testing patterns
  and env mocking
- [understanding-flow](../walkeros-understanding-flow/SKILL.md) - Architecture
  and data flow
- [using-cli](../walkeros-using-cli/SKILL.md) - CLI simulate and validate
  commands
- [create-destination](../walkeros-create-destination/SKILL.md) - Destination
  creation workflow
- [create-source](../walkeros-create-source/SKILL.md) - Source creation workflow
- [create-transformer](../walkeros-create-transformer/SKILL.md) - Transformer
  creation workflow

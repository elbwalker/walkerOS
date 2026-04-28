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
- **Simulation data** for `walkeros push --simulate`
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
  in: unknown; // Platform-specific input
  out: StepOut; // Array of effect tuples - see shape rules below
  trigger?: { type?: string; options?: unknown }; // How to invoke
  mapping?: unknown; // Destination mapping rule
  command?: 'config' | 'consent' | 'user' | 'run'; // Route to walker command
}
```

`out` is **always an array of effect tuples**, even for a single effect. Each
tuple is `[callable, ...args]`. The first element is the callable's public name
(the SDK function users would write). Remaining elements are the arguments.

### Callable conventions

| Component type                 | Callable                                | Notes                                                                                   |
| ------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------- |
| Destination (SDK function)     | `'gtag'`, `'fbq'`, `'ttq.track'`        | Public SDK name. Dotted paths render literally.                                         |
| Destination (method on global) | `'analytics.track'`, `'dataLayer.push'` | Method notation.                                                                        |
| Destination (HTTP)             | `'fetch'`, `'sendServer'`               | The actual call users would make. NOT `env.*` prop names - those are internal plumbing. |
| Source                         | `'elb'`                                 | The walker public push API.                                                             |
| Transformer                    | `'return'`                              | Reserved keyword. Renders as `return <value>` (no parens).                              |

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
    body: { name: 'order complete', data: { id: 'ORD-123', total: 149.97 } },
  },
  out: [
    ['elb', { name: 'order complete', data: { id: 'ORD-123', total: 149.97 } }],
  ],
};
```

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
      },
    ],
  ],
};
```

### Transformer Step Example

`in` is a walkerOS event, `out` is a `['return', value]` tuple. An empty array
means the transformer passed the event through unchanged:

```typescript
export const step = {
  orderPasses: {
    in: { name: 'order complete', data: { id: 'ORD-123' } },
    out: [['return', { name: 'order complete', data: { id: 'ORD-123' } }]],
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

### Destination Step Example

`in` is a walkerOS event, `mapping` is the mapping rule that transforms it,
`out` is an array of call tuples - one per observable effect the destination
produces. Multi-call events (e.g., GA4 + Ads + GTM for a single walker event)
flatten into a single array in execution order:

```typescript
import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000000 }),
  mapping: {
    name: 'Purchase',
    data: { map: { value: 'data.total', currency: { value: 'EUR' } } },
  },
  out: [
    [
      'fbq',
      'track',
      'Purchase',
      { value: 555, currency: 'EUR' },
      { eventID: '1700000000-gr0up-1' },
    ],
  ],
};
```

Multi-tool example (one walker event produces GA4, Ads, GTM in order):

```typescript
out: [
  ['gtag', 'event', 'purchase', { transaction_id: 'o1', value: 555 }],
  ['gtag', 'event', 'conversion', { send_to: 'AW-123', value: 555 }],
  ['dataLayer.push', { event: 'purchase', ecommerce: { ... } }],
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
  in: { marketing: true, functional: true },
  out: [
    'consent',
    'update',
    { ad_storage: 'granted', analytics_storage: 'granted' },
  ],
};
```

Supported commands: `config`, `consent`, `user`, `run`.

- When `command` is absent (default), `in` is pushed as a regular event via
  `elb(in)`.
- When `command` is set, `mapping` is **not** applied - commands don't flow
  through event mapping.
- The `out` format is destination-specific. For gtag it's
  `[action, subAction, params]` matching `gtag(...)` calls.

## Writing Examples

### Best Practices

1. **Use camelCase names** -- descriptive of the scenario (`checkoutPost`,
   `debugFiltered`, `pageViewBasic`)
2. **Cover happy path and edge cases** -- include at least one positive and one
   negative case for transformers
3. **Use realistic data** -- real-looking event names, IDs, and values
4. **Keep examples minimal** -- only include fields relevant to the step's
   logic; omit empty/default-value fields (`context: {}`, `nested: []`,
   `user: {}`, etc.)
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
  in: getEvent('order complete', { timestamp: 1700000000 }),
  mapping: { name: 'Purchase', data: { map: { value: 'data.total' } } },
  out: ['track', 'Purchase', { value: 555 }, { eventID: '1700000000-gr0up-1' }],
};

// src/examples/index.ts
export * as env from './env';
export * as step from './step';
```

The file exports **only** `Flow.StepExample` objects. No intermediate variables,
no `all`, no `config`. Consumers iterate via `Object.entries(examples.step)`.

## Metadata: title, description, public

Every `Flow.StepExample` accepts three optional metadata fields that control how
it surfaces in docs and MCP output:

- **`title?: string`** - overrides the default camelCase-to-spaced heading in
  website docs. Keep it short (2-5 words), human-readable.
- **`description?: string`** - one short sentence (10-25 words) rendered above
  each example in docs and surfaced in MCP `flow_examples` output. Explains what
  the example demonstrates, not how.
- **`public?: boolean`** - defaults to `true`. When `false`, the example is
  excluded from the website docs render and from default MCP `flow_examples`
  output. It still runs in tests and remains callable via CLI/MCP
  `flow_simulate`.

```typescript
export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order mapped to the Meta Pixel Purchase standard event.',
  in: getEvent('order complete', { timestamp: 1700000000 }),
  mapping: { name: 'Purchase', data: { map: { value: 'data.total' } } },
  out: [['fbq', 'track', 'Purchase', { value: 555, currency: 'EUR' }]],
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
  in: '<button data-elb="cta">Sign Up</button>',
  trigger: { type: 'click' },
  out: { name: 'cta click', data: { label: 'Sign Up' } }
}
```

When simulating via CLI or MCP, the step example maps to `SourceInput`:

- `in` -> `content` (the actual source input)
- `trigger` -> `trigger` (which mechanism to fire)

Destination and transformer examples don't use `trigger`.

## Simulating with Step Examples

Use the `--step` flag to target a specific step, then provide the event as
`SourceInput` (`{ content, trigger? }`):

```bash
# Simulate a source step with trigger metadata
walkeros push flow.json --simulate source.browser --event '{"content":"<html>...","trigger":{"type":"click"}}'
```

The MCP `flow_examples` tool returns `trigger` metadata alongside `in`/`out`,
and `mapping` for destination examples, giving full visibility into how input
events are transformed to vendor-specific output.

## Validating Examples

Cross-step example validation is included automatically when validating a flow:

```bash
# Validate flow config including step example compatibility
walkeros validate flow.json
```

Flow validation checks that:

- Source `out` types match transformer `in` types
- Transformer `out` types match destination `in` types
- Connected steps have compatible examples

## Testing with Examples

The primary use of step examples is automated testing with `it.each`.

### Source Tests (createTrigger)

Sources export `createTrigger` from their examples. It follows the unified
`Trigger.CreateFn` interface: receives `Collector.InitConfig`, lazily starts the
flow, and returns a trigger function that simulates real-world invocations.

Each package implements createTrigger differently:

- **Browser:** Injects HTML into DOM, starts flow, dispatches native events
- **Express:** Boots real HTTP server, sends `fetch()` requests

Use a spy destination to capture events:

```typescript
import type { Destination, WalkerOS } from '@walkeros/core';
import { sourceExpress } from '@walkeros/server-source-express';
import { examples } from '@walkeros/server-source-express/dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const events: WalkerOS.Event[] = [];
    const spy: Destination.Instance = {
      type: 'spy',
      config: { init: true },
      push: jest.fn((event) => {
        events.push(JSON.parse(JSON.stringify(event)));
      }),
    };

    const instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        express: { code: sourceExpress, config: { settings: { port: 0 } } },
      },
      destinations: { spy: { code: spy } },
    });

    await instance.trigger(example.trigger?.type)(example.in);

    const found = events.find((e) => e.name === example.out.name);
    expect(found).toBeDefined();
  });
});
```

**Browser source note:** The browser source's elbLayer processes events via a
detached promise chain (fire-and-forget). For interactive triggers (click,
submit), poll until events arrive:

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

// Yield for detached elb('walker consent') chain
while (!Object.keys(instance.flow!.collector.config.consent || {}).length)
  await Promise.resolve();

expect(instance.flow!.collector.config.consent).toEqual(
  expect.objectContaining(expected),
);
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

For destinations, use `startFlow` + `elb()` to run events through the real
collector pipeline. This verifies the full flow including mapping:

```typescript
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from './dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as Rule | undefined;

    const mockFn = jest.fn();
    const env = clone(examples.env.push);
    env.window.fbq = mockFn;

    const dest = jest.requireActual('.').default;
    const { elb } = await startFlow({});

    // Build mapping config from event entity/action
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { pixelId: '1234567890' },
        mapping: mappingConfig,
      },
    );

    await elb(event);
    expect(mockFn).toHaveBeenLastCalledWith(...(example.out as unknown[]));
  });
});
```

### Transformer Tests

For transformers that can return `false`:

```typescript
import { examples } from '../dev';

describe('transformer', () => {
  it.each(Object.entries(examples.step))(
    '%s',
    async (name, { in: input, out: expected }) => {
      const result = await transformer.push(input, context);
      if (expected === false) {
        expect(result).toBe(false);
      } else {
        expect(result).toEqual(expected);
      }
    },
  );
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
- [ ] Verify examples compile: `npm run build`
- [ ] Run tests: `npm run test`
- [ ] Add `title` and `description` to every public example.
- [ ] Mark internal/test-only examples with `public: false`.

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

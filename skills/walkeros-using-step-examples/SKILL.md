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
- **Simulation data** for `walkeros simulate`
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

## The `in`/`out` Format

Every step example is an object with `in` (input) and `out` (expected output):

### Source Step Example

`in` is platform-specific, `out` is a walkerOS event:

```typescript
export const step = {
  'checkout-post': {
    in: {
      method: 'POST',
      path: '/collect',
      headers: { 'content-type': 'application/json' },
      body: { name: 'order complete', data: { id: 'ORD-123', total: 149.97 } },
    },
    out: { name: 'order complete', data: { id: 'ORD-123', total: 149.97 } },
  },
};
```

### Transformer Step Example

`in` is a walkerOS event, `out` is a walkerOS event or `false`:

```typescript
export const step = {
  'order-passes': {
    in: { name: 'order complete', data: { id: 'ORD-123' } },
    out: { name: 'order complete', data: { id: 'ORD-123' } },
  },
  'debug-filtered': {
    in: { name: 'debug test', data: { message: 'noise' } },
    out: false, // Transformer rejects this event
  },
};
```

### Destination Step Example

`in` is a walkerOS event, `mapping` is the mapping rule that transforms it,
`out` is vendor-specific:

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
    'track',
    'Purchase',
    { value: 555, currency: 'EUR' },
    { eventID: '1700000000-gr0up-1' },
  ],
};
```

Each export is a self-contained `Flow.StepExample` — no intermediate variables,
no `all` aggregation. The `mapping` field ties the mapping rule to the example
so tests can register it dynamically:
`{ [event.entity]: { [event.action]: example.mapping } }`.

Consumers iterate all examples via `Object.entries(examples.step)` —
`export * as step` exposes every named export directly.

## Writing Examples

### Best Practices

1. **Use kebab-case names** -- descriptive of the scenario (`checkout-post`,
   `debug-filtered`, `page-view-basic`)
2. **Cover happy path and edge cases** -- include at least one positive and one
   negative case for transformers
3. **Use realistic data** -- real-looking event names, IDs, and values
4. **Keep examples minimal** -- only include fields relevant to the step's
   logic; omit empty/default-value fields (`context: {}`, `nested: []`,
   `user: {}`, etc.)
5. **Export from `examples/step.ts`** -- follow the existing `dev.ts` structure

### File Structure

```typescript
// src/examples/step.ts — only Flow.StepExample exports, nothing else
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

## Simulating with Examples

Use the `--example` flag to simulate a flow with a named step example:

```bash
# Simulate the "purchase" step example
walkeros simulate flow.json --example purchase

# Output shows the full pipeline trace:
# Source → Transformer(s) → Destination
# With in/out values at each step
```

This runs the named example through the full flow pipeline, showing how data
transforms at each step.

## Validating Examples

Use the `--deep` flag to cross-validate step examples across connected steps:

```bash
# Validate flow config including step example compatibility
walkeros validate flow.json --deep
```

Deep validation checks that:

- Source `out` types match transformer `in` types
- Transformer `out` types match destination `in` types
- Connected steps have compatible examples

## Testing with Examples

The primary use of step examples is automated testing with `it.each`.

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
    const { elb } = await startFlow({ tagging: 2 });

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
- [ ] Use kebab-case, descriptive example names
- [ ] Include at least one happy-path example
- [ ] For transformers, include a `false` (filtered) case
- [ ] Add `it.each` test using step examples
- [ ] Verify examples compile: `npm run build`
- [ ] Run tests: `npm run test`

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

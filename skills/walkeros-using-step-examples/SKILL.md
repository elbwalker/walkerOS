---
name: walkeros-using-step-examples
description:
  Use when writing, simulating, validating, or testing with walkerOS step
  examples. Covers the complete lifecycle from authoring examples to CI
  integration.
---

# Using Step Examples

## Overview

Step examples are structured `{ in, out }` pairs that define the expected
input/output behavior of each step in a flow. They serve as:

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

`in` is a walkerOS event, `out` is vendor-specific:

```typescript
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
// src/examples/step.ts
export const step = {
  'example-name': {
    in: {
      /* input */
    },
    out: {
      /* expected output */
    },
  },
};

// src/examples/index.ts
export * as env from './env';
export * as events from './events';
export * as mapping from './mapping';
export * as step from './step';
```

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

The primary use of step examples is automated testing with `it.each`:

```typescript
import { examples } from '../dev';

describe('destination', () => {
  it.each(Object.entries(examples.step))(
    '%s',
    (name, { in: input, out: expected }) => {
      const result = destination.push(input, context);
      expect(result).toEqual(expected);
    },
  );
});
```

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

- [ ] Create `src/examples/step.ts` with `{ in, out }` pairs
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

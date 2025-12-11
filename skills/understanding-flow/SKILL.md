---
name: understanding-flow
description:
  Use when learning walkerOS architecture, understanding data flow, or designing
  composable event pipelines. Covers Source→Collector→Destination pattern and
  separation of concerns.
---

# Understanding walkerOS Flow

## Overview

walkerOS follows a **Source → Collector → Destination(s)** architecture for
composable, modular event processing.

**Core principle:** Separation of concerns. Each component has one job.
Components are composable and replaceable.

## The Flow Pattern

```
Sources          →    Collector    →    Destinations
(Data Capture)        (Processing)      (Delivery)

- Browser DOM         - Validation      - Google Analytics
- DataLayer           - Enrichment      - Meta Pixel
- Server HTTP         - Consent check   - Custom API
- Cloud Functions     - Routing         - Data Warehouse
```

## Key Concepts

### Composability

A Flow combines components. You can:

- Use multiple sources feeding one collector
- Route events to multiple destinations
- Swap components without changing others

### The Flow Type

See [packages/core/src/types/flow.ts](../../packages/core/src/types/flow.ts) for
the canonical interface.

```typescript
// Conceptual structure (see source for full type)
interface Flow {
  sources?: Record<string, Source>;
  collector: Collector;
  destinations?: Record<string, Destination>;
}
```

### Universal Push Interface

**All components communicate via `push` functions:**

| Component   | Push Signature                | Purpose               |
| ----------- | ----------------------------- | --------------------- |
| Source      | `push(input) → events`        | Capture external data |
| Collector   | `push(event) → void`          | Process and route     |
| Destination | `push(event, context) → void` | Transform and deliver |

The `elb()` function is an alias for `collector.push` - used for component
wiring.

### startFlow Helper

See [packages/collector/src/flow.ts](../../packages/collector/src/flow.ts) for
the `startFlow` function.

```typescript
import { startFlow } from '@walkeros/collector';

const { collector, elb } = await startFlow({
  sources: {
    /* ... */
  },
  destinations: {
    /* ... */
  },
});
```

## Separation of Concerns

| Concern          | Handled By     | NOT Handled By          |
| ---------------- | -------------- | ----------------------- |
| Event capture    | Sources        | Collector, Destinations |
| Event structure  | Event model    | Components              |
| Consent checking | Collector      | Sources, Destinations   |
| Transformation   | Mapping system | Raw push calls          |
| Delivery         | Destinations   | Sources, Collector      |

## Related

**Skills:**

- [understanding-events skill](../understanding-events/SKILL.md) - Event model
- [understanding-destinations skill](../understanding-destinations/SKILL.md) -
  Destination interface
- [understanding-sources skill](../understanding-sources/SKILL.md) - Source
  interface

**Package READMEs:**

- [packages/collector/README.md](../../packages/collector/README.md) - Collector
  details

**Source Files:**

- [packages/collector/src/flow.ts](../../packages/collector/src/flow.ts) -
  startFlow implementation

**Documentation:**

- [Website: Flow](../../website/docs/getting-started/flow.mdx) - Flow concept
- [Website: Collector](../../website/docs/collector/index.mdx) - Collector docs

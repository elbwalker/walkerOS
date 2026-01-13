---
name: understanding-processors
description:
  Use when working with processors, understanding event
  validation/enrichment/redaction, or learning about processor chaining. Covers
  interface, return values, and pipeline integration.
---

# Understanding walkerOS Processors

## Overview

Processors are middleware for **validating**, **enriching**, and **redacting**
events in the walkerOS pipeline. They run in chains at configurable points
between sources, collector, and destinations.

**Core principle:** Processors transform events. They don't capture (sources) or
deliver (destinations)—they modify events in-flight.

## Use Cases

| Use Case     | Purpose                                   | Example                  |
| ------------ | ----------------------------------------- | ------------------------ |
| **Validate** | Ensure events match schema contracts      | JSON Schema validation   |
| **Enrich**   | Add server-side data to events            | User segments, geo data  |
| **Redact**   | Remove sensitive data before destinations | Strip PII, anonymize IPs |

## Processor Interface

See
[packages/core/src/types/processor.ts](../../packages/core/src/types/processor.ts)
for canonical interface.

### Init Function (Context Pattern)

Processors use a context-based initialization pattern:

```typescript
import type { Processor } from '@walkeros/core';

export const processorMyProcessor: Processor.Init<Types> = (context) => {
  const { config = {}, env, logger, id } = context;
  const settings = SettingsSchema.parse(config.settings || {});

  return {
    push(event, pushContext) {
      // Process event
      return event;
    },
  };
};
```

**Init Context contains:**

| Property    | Type                 | Purpose                       |
| ----------- | -------------------- | ----------------------------- |
| `config`    | `Processor.Config`   | Settings, mapping, next chain |
| `env`       | `Types['env']`       | Environment dependencies      |
| `logger`    | `Logger`             | Logging functions             |
| `id`        | `string`             | Processor identifier          |
| `collector` | `Collector.Instance` | Reference to collector        |
| `ingest`    | `Ingest` (optional)  | Request metadata from source  |

### Instance Methods

| Method    | Purpose                              | Required     |
| --------- | ------------------------------------ | ------------ |
| `push`    | Process event, return modified/false | **Required** |
| `init`    | One-time initialization              | Optional     |
| `destroy` | Cleanup resources                    | Optional     |

## Return Values

The `push` function controls event flow:

| Return  | Behavior                           |
| ------- | ---------------------------------- |
| `event` | Continue chain with modified event |
| `void`  | Continue chain, event unchanged    |
| `false` | Stop chain, event dropped          |

```typescript
push(event, context) {
  if (!event.data?.id) {
    context.logger.error('Missing required id');
    return false;  // Stop chain
  }

  event.data.enrichedAt = Date.now();
  return event;  // Continue with modified event
}
```

## Pipeline Integration

Processors run at two points in the pipeline:

```
Source → [Pre-Processors] → Collector → [Post-Processors] → Destination
          (source.next)                   (destination.before)
```

### Pre-Collector Chain

Runs after source captures event, before collector enrichment:

```typescript
sources: {
  browser: {
    code: sourceBrowser,
    next: 'validate'  // First processor in pre-chain
  }
}
```

### Post-Collector Chain

Runs after collector enrichment, before destination receives event:

```typescript
destinations: {
  gtag: {
    code: destinationGtag,
    before: 'redact'  // First processor in post-chain
  }
}
```

### Chain Linking

Processors link together via `next`:

```typescript
processors: {
  validate: {
    code: processorValidator,
    config: { next: 'enrich' }  // Chain to next processor
  },
  enrich: {
    code: processorEnrich,
    config: { next: 'redact' }
  },
  redact: {
    code: processorRedact
    // No next = end of chain
  }
}
```

## Push Context

The `push` function receives a context with event metadata:

| Property    | Purpose                      |
| ----------- | ---------------------------- |
| `config`    | Processor configuration      |
| `env`       | Environment dependencies     |
| `logger`    | Scoped logger for output     |
| `id`        | Processor identifier         |
| `collector` | Access to collector instance |
| `ingest`    | Request metadata from source |

```typescript
push(event, context) {
  const { logger, id, ingest } = context;

  logger.debug('Processing', { processor: id, event: event.event });

  // Access request metadata if available
  if (ingest?.ip) {
    event.data = { ...event.data, clientIp: ingest.ip };
  }

  return event;
}
```

## Processor Paths

| Path                             | Description         |
| -------------------------------- | ------------------- |
| `packages/processors/`           | Processor packages  |
| `packages/processors/validator/` | Validator processor |

## Related

**Skills:**

- [understanding-flow skill](../understanding-flow/SKILL.md) - How processors
  fit in architecture
- [understanding-events skill](../understanding-events/SKILL.md) - Event
  structure processors work with
- [create-processor skill](../create-processor/SKILL.md) - Create new processor

**Source Files:**

- [packages/core/src/types/processor.ts](../../packages/core/src/types/processor.ts) -
  Interface

**Package READMEs:**

- [packages/processors/validator/README.md](../../packages/processors/validator/README.md) -
  Validator processor

**Documentation:**

- [Website: Processors](../../website/docs/processors/index.mdx) - Overview
- [Website: Validator](../../website/docs/processors/validator.mdx) - Validator
  docs
- [Website: Create Your Own](../../website/docs/processors/create-your-own.mdx) -
  Guide

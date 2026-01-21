---
name: create-source
description:
  Use when creating a new walkerOS source. Example-driven workflow starting with
  research and input examples before implementation.
---

# Create a New Source

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../understanding-flow/SKILL.md) - How sources fit in
  architecture
- [understanding-sources](../understanding-sources/SKILL.md) - Source interface
- [understanding-transformers](../understanding-transformers/SKILL.md) -
  Transformer chaining from sources
- [understanding-events](../understanding-events/SKILL.md) - Event structure
  sources emit
- [understanding-mapping](../understanding-mapping/SKILL.md) - Transform raw
  input to events
- [testing-strategy](../testing-strategy/SKILL.md) - How to test
- [writing-documentation](../writing-documentation/SKILL.md) - Documentation
  standards (for Phase 7)

## Source Types

| Type   | Platform | Input                   | Example                             |
| ------ | -------- | ----------------------- | ----------------------------------- |
| Web    | Browser  | DOM events, dataLayer   | `browser`, `dataLayer`              |
| Server | Node.js  | HTTP requests, webhooks | `gcp`, `express`, `lambda`, `fetch` |

## Source Categories

Sources fall into two categories based on their primary function:

| Category           | Purpose                                   | Examples                | Key Concern          |
| ------------------ | ----------------------------------------- | ----------------------- | -------------------- |
| **Transformation** | Convert external format → walkerOS events | `dataLayer`, `fetch`    | Mapping accuracy     |
| **Transport**      | Receive events from specific platform     | `gcp`, `aws`, `express` | Platform integration |

**Transformation sources** focus on data conversion - they take input in one
format and produce walkerOS events. The `fetch` source is the purest example.

**Transport sources** focus on platform integration - they handle
platform-specific concerns (authentication, request parsing, response format)
while delegating transformation. The `gcp` and `aws` sources wrap HTTP handlers
for their respective cloud platforms.

Many sources are both - they handle platform transport AND transform data.

## Choose Your Template

| Complexity            | Template       | When to Use                           |
| --------------------- | -------------- | ------------------------------------- |
| Simple transformation | `fetch/`       | Generic HTTP handler, data conversion |
| Platform transport    | `gcp/`, `aws/` | Cloud platform integration            |
| Browser interception  | `dataLayer/`   | DOM events, array interception        |

## Process Overview

```
1. Research     → Understand input format, find SDK/types
2. Examples     → Create input examples in dev entry FIRST
3. Mapping      → Define input → walkerOS event transformation
4. Scaffold     → Copy template and configure
5. Implement    → Build using examples as test fixtures
6. Test         → Verify against example variations
7. Document     → Write README
```

---

## Phase 1: Research

**Goal:** Understand the input format before writing any code.

### 1.1 Identify Input Source

- [ ] **What triggers events?** - HTTP POST, webhook, DOM mutation, dataLayer
      push
- [ ] **What data is received?** - Request body, headers, query params
- [ ] **Authentication?** - API keys, signatures, tokens

### 1.2 Find Official Resources

```bash
# Search npm for official types
npm search @[platform]
npm info @types/[platform]

# Check for official SDK
npm search [platform]-sdk
```

### 1.3 Document Input Schema

Capture real examples of incoming data:

| Field        | Type   | Required | Description            |
| ------------ | ------ | -------- | ---------------------- |
| `event`      | string | Yes      | Event type from source |
| `properties` | object | No       | Event data             |
| `userId`     | string | No       | User identifier        |
| `timestamp`  | number | No       | Event time             |

### 1.4 Map to walkerOS Events

Plan how input fields become walkerOS events:

| Source Field      | walkerOS Field | Notes                               |
| ----------------- | -------------- | ----------------------------------- |
| `event`           | `name`         | May need "entity action" conversion |
| `properties.page` | `data`         | Direct mapping                      |
| `userId`          | `user.id`      | User identification                 |

### 1.5 Check Existing Patterns

```bash
# List existing sources
ls packages/web/sources/
ls packages/server/sources/

# Reference implementations
# - dataLayer: DOM-based, array interception
# - express: HTTP middleware
# - fetch: Generic HTTP handler (simplest server pattern)
# - gcp: Cloud Functions specific
```

### Gate: Research Complete

Before proceeding, confirm:

- [ ] Input trigger identified (HTTP, webhook, DOM, dataLayer)
- [ ] Input schema documented (required/optional fields)
- [ ] Fields mapped to walkerOS event structure

### Checkpoint: Research Review (Optional)

If working with human oversight, pause here to confirm:

- Input format and trigger mechanism correct?
- Event name mapping makes sense?
- Any platform quirks or auth requirements?

Continue only after approval.

---

## Phase 2: Create Input Examples (BEFORE Implementation)

**Goal:** Define realistic input data in `dev` entry FIRST.

### 2.1 Scaffold Directory Structure

```bash
mkdir -p packages/server/sources/[name]/src/{examples,schemas,types}
```

### 2.2 Create Input Examples

**Real examples of what the source will receive:**

`src/examples/inputs.ts`:

```typescript
/**
 * Examples of incoming data this source will receive.
 * These define the CONTRACT - implementation must handle these inputs.
 */

// Page view from external system
export const pageViewInput = {
  event: 'page_view',
  properties: {
    page_title: 'Home Page',
    page_path: '/home',
    referrer: 'https://google.com',
  },
  userId: 'user-123',
  timestamp: 1700000000000,
};

// E-commerce event
export const purchaseInput = {
  event: 'purchase',
  properties: {
    transaction_id: 'T-123',
    value: 99.99,
    currency: 'USD',
    items: [{ item_id: 'P-1', item_name: 'Widget', price: 99.99 }],
  },
  userId: 'user-123',
  timestamp: 1700000001000,
};

// Custom event
export const customEventInput = {
  event: 'button_click',
  properties: {
    button_id: 'cta',
    button_text: 'Sign Up',
  },
  timestamp: 1700000002000,
};

// Edge cases
export const minimalInput = {
  event: 'ping',
};

export const invalidInput = {
  // Missing event field
  properties: { foo: 'bar' },
};
```

### 2.3 Create Expected Output Examples

**walkerOS events that should result from inputs:**

`src/examples/outputs.ts`:

```typescript
import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS events from inputs.
 * Tests verify implementation produces these outputs.
 */

// From pageViewInput → walkerOS event
export const pageViewEvent: Partial<WalkerOS.Event> = {
  event: 'page view',
  data: {
    title: 'Home Page',
    path: '/home',
    referrer: 'https://google.com',
  },
  user: { id: 'user-123' },
};

// From purchaseInput → walkerOS event
export const purchaseEvent: Partial<WalkerOS.Event> = {
  event: 'order complete',
  data: {
    id: 'T-123',
    total: 99.99,
    currency: 'USD',
  },
};

// From customEventInput → walkerOS event
export const buttonClickEvent: Partial<WalkerOS.Event> = {
  event: 'button click',
  data: {
    id: 'cta',
    text: 'Sign Up',
  },
};
```

### 2.4 Create HTTP Request Examples (Server Sources)

`src/examples/requests.ts`:

```typescript
/**
 * HTTP request examples for testing handlers.
 */

export const validPostRequest = {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': 'test-key',
  },
  body: JSON.stringify(inputs.pageViewInput),
};

export const batchRequest = {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    batch: [inputs.pageViewInput, inputs.purchaseInput],
  }),
};

export const invalidRequest = {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: 'invalid json{',
};
```

### 2.5 Export via dev.ts

`src/dev.ts`:

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Gate: Examples Valid

- [ ] All example files compile (`npm run build`)
- [ ] Can trace: input → expected output for each example
- [ ] Edge cases included (minimal input, invalid input)

---

## Phase 3: Define Mapping

**Goal:** Document transformation from input format to walkerOS events.

### 3.1 Create Mapping Configuration

`src/examples/mapping.ts`:

```typescript
import type { Mapping } from '@walkeros/core';

/**
 * Default mapping: input format → walkerOS events.
 */

// Event name transformation
export const eventNameMap: Record<string, string> = {
  page_view: 'page view',
  purchase: 'order complete',
  button_click: 'button click',
  add_to_cart: 'product add',
};

// Data field mapping
export const defaultMapping: Mapping.Rules = {
  page: {
    view: {
      data: {
        map: {
          title: 'properties.page_title',
          path: 'properties.page_path',
          referrer: 'properties.referrer',
        },
      },
    },
  },
  order: {
    complete: {
      data: {
        map: {
          id: 'properties.transaction_id',
          total: 'properties.value',
          currency: 'properties.currency',
        },
      },
    },
  },
};
```

### 3.2 Verify Mapping Logic

Create a trace:

```
Input: inputs.pageViewInput
  ↓ eventNameMap: 'page_view' → 'page view'
  ↓ Entity: 'page', Action: 'view'
  ↓ Apply mapping: page.view rule
  ↓ properties.page_title → title
  ↓ properties.page_path → path
Output: Should match outputs.pageViewEvent
```

### Gate: Mapping Verified

- [ ] Event name map covers main input types
- [ ] Each mapping rule traces correctly to expected output

---

## Phase 4: Scaffold

**Template sources:**

- Web: `packages/web/sources/dataLayer/`
- Server: `packages/server/sources/fetch/` (simplest pattern)

```bash
cp -r packages/server/sources/fetch packages/server/sources/[name]
cd packages/server/sources/[name]

# Update package.json: name, description, repository.directory
```

**Directory structure:**

```
packages/server/sources/[name]/
├── src/
│   ├── index.ts           # Main export
│   ├── index.test.ts      # Tests against examples
│   ├── dev.ts             # Exports schemas and examples
│   ├── examples/
│   │   ├── index.ts       # Re-exports
│   │   ├── inputs.ts      # Incoming data examples
│   │   ├── outputs.ts     # Expected walkerOS events
│   │   ├── requests.ts    # HTTP request examples
│   │   └── mapping.ts     # Transformation config
│   ├── schemas/
│   │   └── index.ts       # Zod schemas for input validation
│   └── types/
│       └── index.ts       # Config, Input interfaces
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
└── README.md
```

### Transformer Chain Integration

Sources can wire to transformer chains via `next` in the init config:

```typescript
export type InitSource<T> = {
  code: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
  primary?: boolean;
  next?: string; // First transformer in pre-collector chain
};
```

Example usage:

```typescript
sources: {
  mySource: {
    code: sourceMySource,
    config: { settings: { /* ... */ } },
    next: 'validate'  // Events go through validator before collector
  }
}
```

---

## Phase 5: Implement

**Now write code to transform inputs to expected outputs.**

### 5.1 Define Types

`src/types/index.ts`:

```typescript
import type { WalkerOS } from '@walkeros/core';

export interface Config {
  mapping?: WalkerOS.Mapping;
  eventNameMap?: Record<string, string>;
}

export interface Input {
  event: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: number;
}

export interface BatchInput {
  batch: Input[];
}
```

### 5.2 Implement Source (Context Pattern)

Sources use the **context pattern** - they receive a single `context` object
containing `config`, `env`, `logger`, `id`, and `collector`.

`src/index.ts`:

```typescript
import type { Source } from '@walkeros/core';
import type { Types, Input } from './types';
import { SettingsSchema } from './schemas';

export * as SourceName from './types';
export * as schemas from './schemas';
export * as examples from './examples';

/**
 * Source initialization using context pattern.
 *
 * @param context - Source context containing:
 *   - config: Source configuration (settings, mapping)
 *   - env: Environment with push, command, elb, logger
 *   - logger: Logger instance
 *   - id: Unique source identifier
 *   - collector: Collector instance reference
 */
export const sourceMySource: Source.Init<Types> = async (context) => {
  // Destructure what you need from context
  const { config = {}, env } = context;
  const { push: envPush, logger } = env;

  // Validate and apply default settings using Zod schema
  const settings = SettingsSchema.parse(config.settings || {});

  const fullConfig: Source.Config<Types> = {
    ...config,
    settings,
  };

  /**
   * Push handler - receives incoming data and forwards to collector.
   * The signature varies by source type (HTTP handler, DOM handler, etc.)
   */
  const push: Types['push'] = async (request) => {
    try {
      const body = await parseRequestBody(request);

      if (!isValidInput(body)) {
        return createErrorResponse(400, 'Invalid input format');
      }

      // Transform to walkerOS event format
      const eventData = transformInput(body, settings);

      // Forward to collector via env.push
      await envPush(eventData);

      return createSuccessResponse();
    } catch (error) {
      // Log errors per using-logger skill (only errors, not routine ops)
      logger?.error('Source processing error', { error });
      return createErrorResponse(500, 'Processing failed');
    }
  };

  return {
    type: 'my-source',
    config: fullConfig,
    push,
  };
};

/**
 * Transform incoming input to walkerOS event format.
 */
function transformInput(input: Input, settings: Types['settings']) {
  const eventName = settings.eventNameMap?.[input.event] ?? input.event;

  return {
    name: eventName,
    data: input.properties ?? {},
    user: input.userId ? { id: input.userId } : undefined,
  };
}

export default sourceMySource;
```

**Key patterns:**

1. **Context destructuring**: Extract `config`, `env`, `logger`, `id` from
   context
2. **Schema validation**: Use Zod schemas to validate settings and provide
   defaults
3. **Forward to collector**: Call `env.push()` to send events to the collector
4. **Error logging**: Use `logger?.error()` for errors only, not routine
   operations
5. **Return Source.Instance**: Return `{ type, config, push }` object

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run lint` passes

---

## Phase 6: Test Against Examples

**Verify implementation produces expected outputs.**

### 6.1 Test Helper Pattern

Create a helper to build source context for tests:

`src/__tests__/index.test.ts`:

```typescript
import { sourceMySource } from '../index';
import type { Source, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Types } from '../types';
import { examples } from '../dev';

// Helper to create source context for testing
function createSourceContext(
  config: Partial<Source.Config<Types>> = {},
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  return {
    config,
    env: env as Types['env'],
    logger: env.logger || createMockLogger(),
    id: 'test-my-source',
    collector: {} as Collector.Instance,
  };
}

describe('sourceMySource', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockPush = jest.fn().mockResolvedValue({
      event: { id: 'test-id' },
      ok: true,
    });
    mockLogger = createMockLogger();
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      const source = await sourceMySource(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      expect(source.type).toBe('my-source');
      expect(typeof source.push).toBe('function');
    });

    it('should merge custom settings with defaults', async () => {
      const source = await sourceMySource(
        createSourceContext(
          { settings: { customOption: true } },
          {
            push: mockPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      expect(source.config.settings?.customOption).toBe(true);
    });
  });

  describe('event processing', () => {
    it('should process valid input and call env.push', async () => {
      const source = await sourceMySource(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      // Use examples for test input
      const request = createMockRequest(examples.inputs.pageViewInput);
      await source.push(request);

      expect(mockPush).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const errorPush = jest.fn().mockRejectedValue(new Error('Failed'));
      const source = await sourceMySource(
        createSourceContext(
          {},
          {
            push: errorPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      const request = createMockRequest(examples.inputs.pageViewInput);
      const response = await source.push(request);

      expect(response.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
```

### 6.2 Key Test Patterns

1. **Use `createSourceContext()` helper** - Standardizes context creation
2. **Mock `env.push`** - Verify events are forwarded to collector
3. **Use examples for test data** - Don't hardcode test values
4. **Test error paths** - Verify graceful error handling and logging

### Gate: Tests Pass

- [ ] `npm run test` passes
- [ ] Tests verify against example outputs (not hardcoded values)
- [ ] Invalid input handled gracefully (no crashes)

---

## Phase 7: Document

Follow the [writing-documentation](../writing-documentation/SKILL.md) skill for:

- README structure and templates
- Example validation against `apps/quickstart/`
- Quality checklist before publishing

Key requirements for source documentation:

- [ ] Input format table documenting expected fields
- [ ] Event name mapping table (source format → walkerOS format)
- [ ] Configuration options table
- [ ] Working code example with imports
- [ ] Installation instructions

---

## Source-Specific Validation

Beyond [understanding-development](../understanding-development/SKILL.md)
requirements (build, test, lint, no `any`):

- [ ] `dev.ts` exports `schemas` and `examples`
- [ ] Examples include edge cases (minimal, invalid input)
- [ ] Invalid input returns gracefully (no crashes, clear error)
- [ ] Tests use examples for assertions (not hardcoded values)

---

## Reference Files

| What            | Where                               |
| --------------- | ----------------------------------- |
| Web template    | `packages/web/sources/dataLayer/`   |
| Server template | `packages/server/sources/fetch/`    |
| Source types    | `packages/core/src/types/source.ts` |
| Event creation  | `packages/core/src/lib/event.ts`    |

## Related

- [understanding-sources skill](../understanding-sources/SKILL.md)
- [understanding-events skill](../understanding-events/SKILL.md)
- [testing-strategy skill](../testing-strategy/SKILL.md)
- [← Back to Hub](../../AGENT.md)

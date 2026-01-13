---
name: create-processor
description:
  Use when creating a new walkerOS processor. Example-driven workflow for
  validation, enrichment, or redaction processors.
---

# Create a New Processor

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../understanding-flow/SKILL.md) - How processors fit in
  architecture
- [understanding-processors](../understanding-processors/SKILL.md) - Processor
  interface
- [understanding-events](../understanding-events/SKILL.md) - Event structure
- [testing-strategy](../testing-strategy/SKILL.md) - How to test
- [writing-documentation](../writing-documentation/SKILL.md) - Documentation
  standards (for Phase 6)

## Processor Categories

| Category     | Purpose                       | Example                      |
| ------------ | ----------------------------- | ---------------------------- |
| **Validate** | Check event structure/content | JSON Schema, required fields |
| **Enrich**   | Add data to events            | Server timestamps, geo data  |
| **Redact**   | Remove/mask sensitive data    | Strip PII, anonymize IPs     |

## Process Overview

```
1. Research     → Understand use case (validate/enrich/redact)
2. Examples     → Create event before/after examples FIRST
3. Scaffold     → Copy template, configure package.json
4. Implement    → Build processor with TDD
5. Test         → Verify against example transformations
6. Document     → Write README
```

---

## Phase 1: Research

**Goal:** Understand what the processor needs to do.

### 1.1 Define Use Case

- [ ] **Category**: Validate, Enrich, or Redact?
- [ ] **Input**: What events will this process?
- [ ] **Output**: What should change? What should be blocked?
- [ ] **Configuration**: What settings does user need?

### 1.2 Check Existing Patterns

```bash
# Reference implementation
ls packages/processors/validator/

# Processor types
cat packages/core/src/types/processor.ts
```

### Gate: Research Complete

- [ ] Category identified (validate/enrich/redact)
- [ ] Input/output transformation defined
- [ ] Configuration options listed

---

## Phase 2: Create Examples (BEFORE Implementation)

**Goal:** Define event transformations in `dev` entry FIRST.

### 2.1 Scaffold Directory Structure

```bash
mkdir -p packages/processors/[name]/src/{examples,schemas,types}
```

### 2.2 Create Event Examples

**Events before and after processing:**

`src/examples/events.ts`:

```typescript
import type { WalkerOS } from '@walkeros/core';

/**
 * Example events for testing processor behavior.
 */

// Event that should pass through modified
export const validEvent: WalkerOS.DeepPartialEvent = {
  event: 'product view',
  data: {
    id: 'P-123',
    name: 'Widget',
    email: 'user@example.com', // Sensitive - should be redacted
  },
};

// Expected output after processing
export const processedEvent: WalkerOS.DeepPartialEvent = {
  event: 'product view',
  data: {
    id: 'P-123',
    name: 'Widget',
    // email removed by redaction
  },
};

// Event that should be blocked
export const invalidEvent: WalkerOS.DeepPartialEvent = {
  event: 'product view',
  data: {
    // Missing required 'id' field
    name: 'Widget',
  },
};
```

### 2.3 Create Config Examples

`src/examples/config.ts`:

```typescript
import type { Processor } from '@walkeros/core';

/**
 * Example configurations for testing.
 */

export const defaultConfig: Processor.Config = {
  settings: {
    fieldsToRedact: ['email', 'phone'],
  },
};

export const strictConfig: Processor.Config = {
  settings: {
    fieldsToRedact: ['email', 'phone', 'ip'],
    logRedactions: true,
  },
};
```

### 2.4 Export via dev.ts

`src/dev.ts`:

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### Gate: Examples Valid

- [ ] All example files compile (`npm run build`)
- [ ] Can trace: input event → expected output for each example

---

## Phase 3: Scaffold

**Template processor:** `packages/processors/validator/`

```bash
cp -r packages/processors/validator packages/processors/[name]
cd packages/processors/[name]

# Update package.json: name, description, repository.directory
```

**Directory structure:**

```
packages/processors/[name]/
├── src/
│   ├── index.ts           # Main export
│   ├── processor.ts       # Processor implementation
│   ├── index.test.ts      # Tests against examples
│   ├── dev.ts             # Exports schemas and examples
│   ├── examples/
│   │   ├── index.ts       # Re-exports
│   │   ├── events.ts      # Before/after event examples
│   │   └── config.ts      # Configuration examples
│   ├── schemas/
│   │   └── index.ts       # Zod schemas for settings
│   └── types/
│       └── index.ts       # Settings, Types interfaces
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
└── README.md
```

---

## Phase 4: Implement

**Now write code to transform examples as expected.**

### 4.1 Define Types

`src/types/index.ts`:

```typescript
import type { Processor } from '@walkeros/core';

export interface Settings {
  fieldsToRedact?: string[];
  logRedactions?: boolean;
}

export interface Types extends Processor.Types<Settings> {}
```

### 4.2 Implement Processor (Context Pattern)

Processors use the **context pattern** - they receive a single `context` object
containing `config`, `env`, `logger`, `id`, and `collector`.

`src/processor.ts`:

```typescript
import type { Processor } from '@walkeros/core';
import type { Settings, Types } from './types';
import { SettingsSchema } from './schemas';

/**
 * Processor initialization using context pattern.
 *
 * @param context - Processor context containing:
 *   - config: Processor configuration (settings)
 *   - env: Environment object
 *   - logger: Logger instance
 *   - id: Unique processor identifier
 *   - collector: Collector instance reference
 *   - ingest: Optional request metadata from source
 */
export const processorRedact: Processor.Init<Types> = (context) => {
  // Destructure what you need from context
  const { config = {} } = context;

  // Validate and apply default settings using Zod schema
  const settings = SettingsSchema.parse(config.settings || {});

  const fullConfig: Processor.Config<Types> = {
    ...config,
    settings,
  };

  return {
    type: 'redact',
    config: fullConfig,

    /**
     * Process event - receives event and push context.
     *
     * @param event - The event to process
     * @param pushContext - Context for this specific push operation
     * @returns event - continue with modified event
     * @returns void - continue with current event unchanged
     * @returns false - stop chain, cancel further processing
     */
    push(event, pushContext) {
      const { logger } = pushContext;
      const fields = settings.fieldsToRedact || [];

      for (const field of fields) {
        if (event.data?.[field] !== undefined) {
          delete event.data[field];

          if (settings.logRedactions) {
            logger?.debug('Redacted field', { field });
          }
        }
      }

      return event;
    },
  };
};
```

**Key patterns:**

1. **Context destructuring**: Extract `config`, `logger`, `id` from init context
2. **Schema validation**: Use Zod schemas to validate settings and provide
   defaults
3. **Push receives pushContext**: The `push` function gets event + push context
4. **Return values**: `event` (continue), `void` (passthrough), `false` (cancel)

### 4.3 Export

`src/index.ts`:

```typescript
export { processorRedact } from './processor';
export type { Settings, Types } from './types';
```

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run lint` passes

---

## Phase 5: Test Against Examples

**Verify implementation produces expected outputs.**

### 5.1 Test Helper Pattern

Create a helper to build processor context for tests:

`src/__tests__/index.test.ts`:

```typescript
import { processorRedact } from '../processor';
import type { Processor, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Types } from '../types';
import { examples } from '../dev';

// Helper to create processor context for testing
function createProcessorContext(
  config: Partial<Processor.Config<Types>> = {},
): Processor.Context<Types> {
  return {
    config,
    env: {} as Types['env'],
    logger: createMockLogger(),
    id: 'test-redact',
    collector: {} as Collector.Instance,
  };
}

// Helper to create push context for testing
function createPushContext(): Processor.Context<Types> {
  return {
    config: {},
    env: {} as Types['env'],
    logger: createMockLogger(),
    id: 'test-redact',
    collector: {} as Collector.Instance,
  };
}

describe('Redact Processor', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  test('redacts specified fields from valid event', () => {
    const processor = processorRedact(
      createProcessorContext({
        settings: { fieldsToRedact: ['email'] },
      }),
    );

    const event = structuredClone(examples.events.validEvent);
    const pushContext = createPushContext();
    const result = processor.push(event, pushContext);

    expect(result).toMatchObject(examples.events.processedEvent);
    expect((result as any).data.email).toBeUndefined();
  });

  test('passes through event when no fields match', () => {
    const processor = processorRedact(
      createProcessorContext({
        settings: { fieldsToRedact: ['ssn'] },
      }),
    );

    const event = structuredClone(examples.events.validEvent);
    const pushContext = createPushContext();
    const result = processor.push(event, pushContext);

    expect((result as any).data.email).toBe('user@example.com');
  });

  test('logs redactions when enabled', () => {
    const processor = processorRedact(
      createProcessorContext({
        settings: {
          fieldsToRedact: ['email'],
          logRedactions: true,
        },
      }),
    );

    const event = structuredClone(examples.events.validEvent);
    const pushContext = {
      ...createPushContext(),
      logger: mockLogger,
    };
    processor.push(event, pushContext);

    expect(mockLogger.debug).toHaveBeenCalledWith('Redacted field', {
      field: 'email',
    });
  });
});
```

### 5.2 Key Test Patterns

1. **Use `createProcessorContext()` helper** - Standardizes init context
   creation
2. **Use `createPushContext()` helper** - Standardizes push context creation
3. **Use examples for test data** - Don't hardcode test values
4. **Test return values** - Verify `event`, `void`, or `false` returns

### Gate: Tests Pass

- [ ] `npm run test` passes
- [ ] Tests verify against example outputs

---

## Phase 6: Document

Follow the [writing-documentation](../writing-documentation/SKILL.md) skill for:

- README structure and templates
- Quality checklist before publishing

Key requirements for processor documentation:

- [ ] Use case description (validate/enrich/redact)
- [ ] Configuration options table
- [ ] Working code example with imports
- [ ] Installation instructions
- [ ] Link to website docs

---

## Processor-Specific Validation

Beyond [understanding-development](../understanding-development/SKILL.md)
requirements (build, test, lint, no `any`):

- [ ] `dev.ts` exports `schemas` and `examples`
- [ ] Examples include before/after event pairs
- [ ] Return values handle all cases (event, void, false)
- [ ] Tests use examples for assertions (not hardcoded values)

---

## Reference Files

| What           | Where                                  |
| -------------- | -------------------------------------- |
| Template       | `packages/processors/validator/`       |
| Types          | `packages/core/src/types/processor.ts` |
| Chaining logic | `packages/collector/src/processor.ts`  |

## Related

- [understanding-processors skill](../understanding-processors/SKILL.md)
- [understanding-flow skill](../understanding-flow/SKILL.md)
- [testing-strategy skill](../testing-strategy/SKILL.md)
- [← Back to Hub](../../AGENT.md)

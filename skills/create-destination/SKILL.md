---
name: create-destination
description:
  Use when creating a new walkerOS destination. Example-driven workflow starting
  with research and examples before implementation.
---

# Create a New Destination

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../understanding-flow/SKILL.md) - How destinations fit in
  architecture
- [understanding-destinations](../understanding-destinations/SKILL.md) -
  Destination interface
- [understanding-transformers](../understanding-transformers/SKILL.md) -
  Transformer chaining to destinations
- [understanding-mapping](../understanding-mapping/SKILL.md) - Event
  transformation
- [testing-strategy](../testing-strategy/SKILL.md) - How to test with env
  pattern
- [writing-documentation](../writing-documentation/SKILL.md) - Documentation
  standards (for Phase 7)

## Choose Your Template

| Complexity | Template     | When to Use                         |
| ---------- | ------------ | ----------------------------------- |
| Simple     | `plausible/` | Single SDK call, minimal config     |
| Complex    | `gtag/`      | Multiple services, sub-destinations |
| Server     | `gcp/`       | Server-side, batching, SDK init     |

## Process Overview

```
1. Research     → Find SDK, understand vendor API
2. Examples     → Create dev entry with real usage patterns
3. Mapping      → Define walkerOS → vendor transformation
4. Scaffold     → Copy template and configure
5. Implement    → Build using examples as test fixtures
6. Test         → Verify against example variations
7. Document     → Write README
```

---

## Phase 1: Research

**Goal:** Understand the vendor API before writing any code.

### 1.1 Find Official Resources

- [ ] **Vendor API Documentation** - Endpoints, authentication, rate limits
- [ ] **Official TypeScript SDK** - Check npm for `@vendor/sdk` or
      `vendor-types`
- [ ] **Event Schema** - What fields are required/optional for each event type

```bash
# Search npm for official packages
npm search [vendor-name]
npm search @[vendor]

# Check for TypeScript types
npm info @types/[vendor]
```

### 1.2 Identify Event Types

List the vendor's event types and their required fields:

| Vendor Event | Required Fields       | walkerOS Equivalent  |
| ------------ | --------------------- | -------------------- |
| `pageview`   | `url`, `title`        | `page view`          |
| `track`      | `event`, `properties` | `product view`, etc. |
| `identify`   | `userId`, `traits`    | User identification  |

### 1.3 Check Existing Patterns

Review similar destinations in the codebase:

```bash
# List existing destinations
ls packages/web/destinations/

# Reference implementations
# - plausible: Simple, script-based
# - gtag: Complex, multiple services
# - meta: Pixel with custom events
```

### Gate: Research Complete

Before proceeding, confirm:

- [ ] API pattern identified (SDK function / HTTP / pixel)
- [ ] Auth method documented (API key, token, none)
- [ ] Event types mapped to walkerOS equivalents

### Checkpoint: Research Review (Optional)

If working with human oversight, pause here to confirm:

- API pattern and auth method correct?
- Event mapping makes sense for the use case?
- Any vendor quirks or rate limits to handle?

Continue only after approval.

---

## Phase 2: Create Examples (BEFORE Implementation)

**Goal:** Define expected API calls in `dev` entry FIRST.

### 2.1 Scaffold Directory Structure

```bash
mkdir -p packages/web/destinations/[name]/src/{examples,schemas,types}
```

### 2.2 Create Output Examples

**What the vendor API expects when we call it:**

`src/examples/outputs.ts`:

```typescript
/**
 * Examples of vendor API calls we will make.
 * These define the CONTRACT - implementation must produce these outputs.
 */

// Page view call
export const pageViewCall = {
  method: 'track',
  args: ['pageview', { url: '/home', title: 'Home Page' }],
};

// E-commerce event call
export const purchaseCall = {
  method: 'track',
  args: [
    'purchase',
    {
      transaction_id: 'T-123',
      value: 99.99,
      currency: 'USD',
      items: [{ item_id: 'P-1', item_name: 'Widget', price: 99.99 }],
    },
  ],
};

// Custom event call
export const customEventCall = {
  method: 'track',
  args: ['button_click', { button_id: 'cta', button_text: 'Sign Up' }],
};
```

### 2.3 Create Input Examples

**walkerOS events that will trigger these outputs:**

`src/examples/events.ts`:

```typescript
import type { WalkerOS } from '@walkeros/core';

/**
 * walkerOS events that trigger destination calls.
 * Maps to outputs.ts examples.
 */
export const events: Record<string, WalkerOS.Event> = {
  // Maps to pageViewCall
  pageView: {
    event: 'page view',
    data: { title: 'Home Page', path: '/home' },
    context: {},
    globals: {},
    user: { device: 'device-123' },
    nested: [],
    consent: { analytics: true },
    id: '1-abc-1',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000000000,
    timing: 0,
    group: 'group-1',
    count: 1,
    version: { tagging: 1, config: 1 },
    source: { type: 'web', id: '', previous_id: '' },
  },

  // Maps to purchaseCall
  purchase: {
    event: 'order complete',
    data: { id: 'T-123', total: 99.99 },
    // ... full event structure
  },

  // Maps to customEventCall
  buttonClick: {
    event: 'button click',
    data: { id: 'cta', text: 'Sign Up' },
    // ... full event structure
  },
};
```

### 2.4 Create Environment Mock

`src/examples/env.ts`:

```typescript
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Mock environment capturing vendor SDK calls.
 */
export const env: { push: DestinationWeb.Env } = {
  push: {
    window: {
      vendorSdk: jest.fn(), // Captures all calls for verification
    } as unknown as Window,
    document: {} as Document,
  },
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
- [ ] Can trace: input event → expected output for each example

---

## Phase 3: Define Mapping

**Goal:** Document transformation from walkerOS events to vendor format.

### 3.1 Create Mapping Examples

`src/examples/mapping.ts`:

```typescript
import type { Mapping } from '@walkeros/core';

/**
 * Default mapping: walkerOS events → vendor format.
 */
export const defaultMapping: Mapping.Rules = {
  page: {
    view: {
      name: 'pageview', // Vendor event name
      data: {
        map: {
          url: 'data.path',
          title: 'data.title',
        },
      },
    },
  },
  order: {
    complete: {
      name: 'purchase',
      data: {
        map: {
          transaction_id: 'data.id',
          value: 'data.total',
          currency: { value: 'USD' },
        },
      },
    },
  },
  button: {
    click: {
      name: 'button_click',
      data: {
        map: {
          button_id: 'data.id',
          button_text: 'data.text',
        },
      },
    },
  },
};
```

### 3.2 Verify Mapping Logic

Create a mental (or actual) trace:

```
Input: events.pageView
  ↓ Apply mapping
  ↓ page.view rule matches
  ↓ name: 'pageview'
  ↓ data.path → url, data.title → title
Output: Should match outputs.pageViewCall
```

### Gate: Mapping Verified

- [ ] Mapping covers: page view + at least one conversion event
- [ ] Each mapping rule traces correctly to expected output

---

## Phase 4: Scaffold

**Template destination:** `packages/web/destinations/plausible/`

```bash
cp -r packages/web/destinations/plausible packages/web/destinations/[name]
cd packages/web/destinations/[name]

# Update package.json: name, description, repository.directory
```

**Directory structure:**

```
packages/web/destinations/[name]/
├── src/
│   ├── index.ts           # Main destination (init + push)
│   ├── index.test.ts      # Tests against examples
│   ├── dev.ts             # Exports schemas and examples
│   ├── examples/
│   │   ├── index.ts       # Re-exports
│   │   ├── env.ts         # Mock environment
│   │   ├── events.ts      # Input events
│   │   ├── outputs.ts     # Expected outputs
│   │   └── mapping.ts     # Default mapping
│   ├── schemas/
│   │   └── index.ts       # Zod schemas
│   └── types/
│       └── index.ts       # Settings, Config types
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
└── README.md
```

### Transformer Chain Integration

Destinations can wire to transformer chains via `before` in the init config:

```typescript
destinations: {
  myDestination: {
    code: destinationMyDestination,
    config: { settings: { /* ... */ } },
    before: 'redact'  // Events go through redactor before this destination
  }
}
```

Each destination can have its own transformer chain, allowing
destination-specific transformations (e.g., redact PII only for external
destinations).

---

## Phase 5: Implement

**Now write code to produce the outputs defined in Phase 2.**

### 5.1 Define Types

`src/types/index.ts`:

```typescript
import type { DestinationWeb } from '@walkeros/web-core';

export interface Settings {
  apiKey?: string;
  // Add vendor-specific settings
}

export interface Config extends DestinationWeb.Config<Settings> {}
export interface Destination extends DestinationWeb.Destination<Config> {}
```

### 5.2 Implement Destination (Context Pattern)

Destinations use the **context pattern** - both `init` and `push` receive
context objects containing `config`, `env`, `logger`, `id`, and other contextual
data.

`src/index.ts`:

```typescript
import type { Config, Destination, Types } from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

export * as DestinationVendor from './types';

export const destinationVendor: Destination = {
  type: 'vendor',
  config: {},

  /**
   * Initialize destination - receives context object.
   *
   * @param context - Init context containing:
   *   - config: Destination configuration (settings, mapping, etc.)
   *   - env: Environment with window, document, etc.
   *   - logger: Logger instance
   *   - id: Unique destination identifier
   *   - collector: Collector instance reference
   *   - data: Pre-computed data from mapping
   */
  init(context) {
    const { config, env, logger } = context;
    const { window } = getEnv(env);
    const settings = config.settings || {};

    if (config.loadScript) addScript(settings, env);

    // Initialize vendor SDK queue
    (window as Window).vendorSdk =
      (window as Window).vendorSdk ||
      function () {
        ((window as Window).vendorSdk.q =
          (window as Window).vendorSdk.q || []).push(arguments);
      };

    return config;
  },

  /**
   * Push event to destination - receives event and push context.
   *
   * @param event - The walkerOS event to send
   * @param context - Push context containing:
   *   - config: Destination configuration
   *   - env: Environment
   *   - logger: Logger instance
   *   - id: Destination identifier
   *   - data: Pre-computed data from mapping
   *   - rule: The matching mapping rule (renamed from 'mapping')
   *   - ingest: Optional request metadata from source
   */
  push(event, context) {
    const { config, data, env, rule } = context;
    const params = isObject(data) ? data : {};
    const { window } = getEnv(env);

    // Call vendor API - must match outputs.ts examples
    (window as Window).vendorSdk('track', event.name, params);
  },
};

function addScript(settings: Types['settings'], env?: DestinationWeb.Env) {
  const { document } = getEnv(env);
  const script = document.createElement('script');
  script.src = `https://vendor.com/sdk.js?key=${settings.apiKey}`;
  document.head.appendChild(script);
}

export default destinationVendor;
```

**Key patterns:**

1. **Init receives context**: Destructure `config`, `env`, `logger`, `id` from
   context
2. **Push receives context**: Includes `data`, `rule` (renamed from `mapping`),
   `ingest`
3. **Use `getEnv(env)`**: Never access `window`/`document` directly
4. **Return config from init**: Allows updating config during initialization

### Gate: Implementation Compiles

- [ ] `npm run build` passes
- [ ] `npm run lint` passes

---

## Phase 6: Test Against Examples

**Verify implementation produces expected outputs.**

### 6.1 Test Helper Pattern

Create helpers to build contexts for tests:

`src/__tests__/index.test.ts`:

```typescript
import { destinationVendor } from '..';
import type { Destination, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Types } from '../types';
import { examples } from '../dev';

// Helper to create push context for testing
function createPushContext(
  overrides: Partial<Destination.PushContext<Types>> = {},
): Destination.PushContext<Types> {
  return {
    config: {},
    env: examples.env.push,
    logger: createMockLogger(),
    id: 'test-vendor',
    collector: {} as Collector.Instance,
    data: {},
    rule: undefined,
    ...overrides,
  };
}

describe('destinationVendor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('page view produces correct output', () => {
    const mockSdk = jest.fn();
    const context = createPushContext({
      env: {
        window: { vendorSdk: mockSdk } as unknown as Window,
        document: {} as Document,
      },
      data: { url: '/home', title: 'Home Page' },
    });

    destinationVendor.push(examples.events.pageView, context);

    // Verify against expected output
    expect(mockSdk).toHaveBeenCalledWith(
      examples.outputs.pageViewCall.method,
      ...examples.outputs.pageViewCall.args,
    );
  });

  test('purchase produces correct output', () => {
    // Similar test against purchaseCall using createPushContext
  });

  test('custom event produces correct output', () => {
    // Similar test against customEventCall using createPushContext
  });
});
```

### 6.2 Key Test Patterns

1. **Use `createPushContext()` helper** - Standardizes context creation
2. **Include `id` field** - Required in context (new requirement)
3. **Use `rule` instead of `mapping`** - Property renamed in PushContext
4. **Use examples for test data** - Don't hardcode test values

### Gate: Tests Pass

- [ ] `npm run test` passes
- [ ] Tests verify against example outputs (not hardcoded values)

---

## Phase 7: Document

Follow the [writing-documentation](../writing-documentation/SKILL.md) skill for:

- README structure and templates
- Example validation against `apps/quickstart/`
- Quality checklist before publishing

Key requirements for destination documentation:

- [ ] Event mapping table (walkerOS → vendor format)
- [ ] Configuration options table (use PropertyTable if schema exists)
- [ ] Working code example with imports
- [ ] Installation instructions

---

## Destination-Specific Validation

Beyond [understanding-development](../understanding-development/SKILL.md)
requirements (build, test, lint, no `any`):

- [ ] Uses `getEnv(env)` pattern (never direct `window`/`document` access)
- [ ] `dev.ts` exports `schemas` and `examples`
- [ ] Examples match type signatures
- [ ] Tests use examples for assertions (not hardcoded values)

---

## Reference Files

| What            | Where                                        |
| --------------- | -------------------------------------------- |
| Simple template | `packages/web/destinations/plausible/`       |
| Complex example | `packages/web/destinations/gtag/`            |
| Types           | `packages/web/core/src/types/destination.ts` |

## Related

- [understanding-destinations skill](../understanding-destinations/SKILL.md)
- [testing-strategy skill](../testing-strategy/SKILL.md)
- [← Back to Hub](../../AGENT.md)

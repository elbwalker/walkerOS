# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Quick Start Commands

### Development

```bash
# Install dependencies
npm install

# Run development mode for all packages
npm run dev

# Run development for specific package
cd packages/[package-name] && npm run dev

# Start website documentation locally
cd website && npm start
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
cd packages/[package-name] && npm run build
```

### Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
cd packages/[package-name] && npm run test

# Watch mode for development
cd packages/[package-name] && npm run dev
```

### Code Quality

```bash
# Run linting across all packages
npm run lint

# Format code
npm run format

# Clean all build artifacts
npm run clean
```

### Publishing

```bash
# Publish packages (includes build, lint, test)
npm run publish-packages
```

## Architecture Overview

walkerOS is a **privacy-first event data collection and tag management solution
as code**. It follows a **Source → Collector → Destination(s)** architecture
pattern for event processing.

### Core Data Flow

```
Sources → Collector → Destinations
(Data Creation)  (Processing)  (Third-party Tools)
```

### Key Components

- **Sources**: Capture events from various sources (browser DOM, dataLayer,
  server)
- **Collector**: Central event processing engine with consent management
- **Destinations**: Transform and send events to analytics/marketing tools
- **Mapping System**: Flexible event transformation and routing

### Package Structure

```
packages/
├── core/           # Platform-agnostic types and utilities
├── collector/      # Central event collection and processing
├── config/         # Shared configuration (eslint, jest, tsconfig, tsup)
├── web/
│   ├── core/       # Web-specific utilities
│   ├── sources/    # Data sources (browser DOM, dataLayer)
│   └── destinations/ # Web destinations (gtag, meta, api, piwikpro, plausible)
└── server/
    ├── core/       # Server-specific utilities
    ├── sources/    # Server sources (gcp)
    └── destinations/ # Server destinations (aws, gcp, meta)
```

### Applications

- **apps/walkerjs**: Ready-to-use browser bundle
- **apps/explorer**: Interactive HTML element explorer and live code editor
- **apps/quickstart**: Code examples and getting started templates
- **website**: Documentation site built with Docusaurus

## Critical Event Model Rules

### 1. Entity-Action Event Naming

**STRICT REQUIREMENT**: All events MUST follow the "ENTITY ACTION" format with
space separation:

- ✅ Correct: `"page view"`, `"product add"`, `"order complete"`,
  `"button click"`
- ❌ Wrong: `"page_view"`, `"purchase"`, `"add_to_cart"`, `"pageview"`

The event name is parsed as: `const [entity, action] = event.split(' ')`

### 2. Universal Push Interface Standard

**CRITICAL**: All walkerOS components communicate via `push` functions:

- **Sources**: `source.push()` - Interface to external world (HTTP, DOM events,
  etc.)
- **Collector**: `collector.push()` - Central event processing
- **Destinations**: `destination.push()` - Receive processed events
- **ELB**: `elb()` - Alias for collector.push, used for component wiring

**Source Push Signatures by Type**:

- Cloud Functions: `push(req, res) => Promise<void>` (HTTP handler)
- Browser: `push(event, data) => Promise<void>` (Walker events)
- DataLayer: `push(event, data) => Promise<void>` (Walker events)

**Key Principle**: Source `push` IS the handler - no wrappers needed. Example:
`http('handler', source.push)` for direct deployment.

### 3. Event Structure

All events follow this consistent structure:

```typescript
{
  name: 'product view',        // ENTITY ACTION format
  data: {                       // Entity-specific properties
    id: 'P123',
    name: 'Laptop',
    price: 999
  },
  context: {                    // State/environment information
    stage: ['shopping', 1],
    test: ['variant-A', 0]
  },
  globals: {                    // Global properties
    language: 'en',
    currency: 'USD'
  },
  user: {                       // User identification
    id: 'user123',
    device: 'device456'
  },
  nested: [                     // Related entities
    { type: 'category', data: { name: 'Electronics' } }
  ],
  consent: { functional: true, marketing: true },
  // System-generated fields:
  id: '1647261462000-01b5e2-2',
  timestamp: 1647261462000,
  entity: 'product',
  action: 'view'
}
```

## Mapping System Architecture

### Core Mapping Functions

From `/workspaces/walkerOS/packages/core/src/mapping.ts`

- **`getMappingEvent(event, mappingRules)`**: Finds the appropriate mapping
  configuration for an event
- **`getMappingValue(value, mappingConfig)`**: Transforms values using flexible
  mapping strategies

### Event Mapping Patterns

```typescript
const mapping = {
  // Exact entity-action match
  product: {
    view: { name: 'view_item' },
    add: { name: 'add_to_cart' },
  },

  // Wildcard patterns
  product: {
    '*': { name: 'product_interaction' }, // Matches any action
  },
  '*': {
    click: { name: 'generic_click' }, // Matches any entity
  },

  // Conditional mappings
  order: {
    complete: [
      {
        condition: (event) => event.data?.value > 100,
        name: 'high_value_purchase',
      },
      { name: 'purchase' }, // Fallback
    ],
  },
};
```

### Value Mapping Strategies

```typescript
// String key mapping
'user.id'  // Extracts nested property

// Static values
{ value: 'USD' }

// Custom functions
{ fn: (event) => event.user.email.split('@')[1] }

// Object transformation
{
  map: {
    item_id: 'data.id',
    item_name: 'data.name',
    currency: { value: 'USD' }
  }
}

// Array processing
{
  loop: [
    'nested',  // Source array
    { map: { item_id: 'data.id' } }  // Transform each item
  ]
}

// Consent-based mapping
{
  key: 'user.email',
  consent: { marketing: true }  // Only return if consent granted
}
```

## Destination Interface

### Standard Destination Structure

```typescript
interface Destination {
  type?: string;
  init?: (context: Context) => Promise<void | Config>;
  push: (event: WalkerOS.Event, context: PushContext) => Promise<void>;
  pushBatch?: (batch: Batch, context: PushBatchContext) => void;
  config: {
    settings?: Settings; // Destination-specific config
    mapping?: MappingRules; // Event transformation rules
    data?: MappingValue; // Global data mapping
    consent?: Consent; // Required consent states
    policy?: Policy; // Processing rules
    queue?: boolean; // Event queuing
    dryRun?: boolean; // Test mode
  };
}
```

### Validated Destination Example

From `apps/quickstart/src/web-destinations/ga4-complete.ts` (working, tested
code):

```typescript
export async function setupGA4Complete(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await startFlow({
    destinations: {
      gtag: {
        ...destinationGtag,
        config: {
          settings: {
            ga4: { measurementId: 'G-XXXXXXXXXX' },
          },
          mapping: {
            product: {
              view: {
                name: 'view_item',
                data: {
                  map: {
                    currency: { value: 'USD' },
                    value: 'data.price',
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return { collector, elb };
}
```

## Elb Function Interfaces

### Collector Elb Interface

The collector provides the core `WalkerOS.Elb` interface (from
`@walkeros/core`):

```typescript
// From apps/quickstart/src/collector/basic.ts (validated example)
export async function trackPageView(elb: WalkerOS.Elb): Promise<void> {
  await elb('page view', {
    title: 'Home Page',
    path: '/',
  });
}

export async function trackUserAction(elb: WalkerOS.Elb): Promise<void> {
  await elb('button click', {
    id: 'cta-button',
    text: 'Get Started',
  });
}
```

### Browser Source Elb Interface

The browser source extends the collector interface with `BrowserPush` (from
`@walkeros/web-source-browser/types/elb.ts`):

- **Additional Commands**: `walker init` for DOM scoping
- **Flexible Arguments**: More permissive argument patterns
- **Browser-Specific Types**: Different destination and context types

**Key Distinction**: Browser sources return their own elb interface that extends
but differs from the collector's elb.

## Development Rules

### 0. Feature Development Protocol

**CRITICAL**: Do NOT add unwanted or non-discussed features, code, or
functionality.

- Plan and discuss before developing any new features
- Only implement explicitly requested functionality
- Ideas and suggestions are welcome AFTER iterations, not during implementation
- Focus on the specific task at hand - avoid scope creep

### 1. TypeScript Strictness

- **NEVER use `any` type** - always use proper TypeScript types
- Use strict type definitions:
  - `@walkeros/core` for shared types
  - Package-specific types from individual packages
  - Internal types for package-specific functionality

### 2. Event Naming Compliance

- Always use space-separated "ENTITY ACTION" format
- Entity should be a noun (page, product, user, order)
- Action should be a verb (view, click, login, complete)

### 3. Mapping Validation

- Reference validated examples from
  `apps/quickstart/src/mappings/custom-functions.ts`
- Use specific mappings over wildcards when possible
- Implement proper consent checking in sensitive mappings

### 4. Test-Driven Documentation

**CRITICAL**: Before documenting code patterns, create functional, executable
tests to validate them.

- Use `/workspaces/walkerOS/apps/quickstart` as the source of truth for working
  examples
- Reference existing tests for validated code patterns
- Follow DRY principle - avoid repeating information

### 5. Development Guidelines

- **No Backward Compatibility Code**: Use migrations and documentation for
  breaking changes
- **Clean Git History**: No inline comments about changes - Git tracks history
- **Rewrite When Needed**: It's OK to refactor/rewrite - just discuss first
- **Build System**: Uses `tsup` with multiple output formats (CJS, ESM, browser
  bundles)
- **Testing**: Jest with environment-specific configurations (jsdom/node)
- **Orchestration**: Turborepo handles parallel builds and dependency ordering

## Monorepo Workflow

1. **Root-level commands**: Use Turborepo for parallel operations across
   packages
2. **Package-specific work**: Navigate to individual packages for focused
   development
3. **Dependency management**: Changes in core packages affect multiple consumers
4. **Testing strategy**: Test changes across all affected packages
5. **Version coordination**: All packages are versioned and published together

## Critical Integration Points

- **Collector is central**: All event flow goes through the collector package
- **Shared types**: Web and server packages use the same core event model
- **Mapping system**: Critical for destination integration and data
  transformation
- **Consent management**: Built into the core architecture, not an afterthought
- **Source flexibility**: Multiple sources can feed into the same collector
  instance

## Consent Handling

Consent is OPTIONAL and configurable at multiple levels:

```typescript
// 1. Destination-level
config: {
  consent: { marketing: true }
}

// 2. Event mapping level
mapping: {
  user: {
    login: {
      consent: { functional: true },
      name: 'user_login'
    }
  }
}

// 3. Value mapping level
data: {
  map: {
    email: {
      key: 'user.email',
      consent: { marketing: true }
    }
  }
}

// 4. Policy level
config: {
  policy: {
    'consent.marketing': true  // Process only if marketing consent
  }
}
```

Without consent requirements, events process normally. With requirements, events
queue until consent is granted.

## Testing Strategy

**Component-Level Integration Tests**: Test each component by mocking external
APIs and using the wrap utility:

- **Destination Testing**: Mock external APIs (gtag, fbq, etc.), verify they're
  called correctly
- **Collector Testing**: Mock destinations and sources, test event processing
- **Source Testing**: Mock collector interface, test event capture and
  transformation

Example patterns:

```typescript
// Test destination by mocking external API
it('sends correct data to gtag', async () => {
  const mockGtag = jest.fn();
  global.gtag = mockGtag;

  const destination = createDestination(config);
  const { wrap } = context;

  // Use wrap to intercept calls
  const wrappedPush = wrap(destination.push);
  await wrappedPush(mockEvent, context);

  // Verify external API was called correctly
  expect(mockGtag).toHaveBeenCalledWith('event', 'view_item', {
    item_id: 'P123',
    value: 99.99,
  });
});

// Test collector with mocked boundaries
it('processes events correctly', async () => {
  const mockDestination = { push: jest.fn() };
  const collector = startFlow({
    destinations: { test: mockDestination },
  });
  await collector.push('page view', {});
  expect(mockDestination.push).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'page view' }),
    expect.any(Object),
  );
});
```

Focus on verifying external API calls, not return values.

## Code Principles

- **Use Core Functions**: Always leverage existing utilities from
  `@walkeros/core`:
  - `getEvent()`, `createEvent()` for event creation
  - `getMappingEvent()`, `getMappingValue()` for transformations
  - `isString()`, `isObject()`, `isDefined()` for type checking
  - `assign()`, `clone()` for object operations
  - `tryCatch()`, `tryCatchAsync()` for error handling
- **Smart Abstractions**: Use Higher-Order Functions (HOF) and avoid redundancy
- **Clean Code**: Keep implementations lean and performant
- **No Inline Change Comments**: Git tracks changes - avoid comments like "//
  Fixed for version X" or "// Changed due to Y"
- **Forward-Looking**: OK to rewrite code - use migrations/docs for breaking
  changes instead of maintaining backward compatibility in code
- **Type Safety**: Use TypeScript strictly without runtime overhead

## Common Pitfalls

- **Event Naming**: Must use space separator: `"page view"` not `"page_view"`
- **Consent**: Not required by default - only when explicitly configured
- **Testing Scope**: Test components individually, not entire chains
- **Core Functions**: Use existing utilities instead of reimplementing
- **Type Imports**: Use `import type` for type-only imports
- **Mock External APIs**: Test destinations by mocking gtag, fbq, etc., not by
  checking returns

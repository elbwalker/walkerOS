walkerOS Environment Standardization: Production-Ready Implementation Guide

## Executive Summary

This document presents the **finalized approach** to standardizing the
environment (env) system in walkerOS destinations. The implementation has been
successfully validated with gtag and plausible destinations, proving the
patterns work for both simple and complex use cases.

**Status**: 🟢 **PRODUCTION READY** - Proven patterns ready for ecosystem-wide
rollout

## Table of Contents

1. [Final Implementation](#final-implementation)
2. [Proven Patterns](#proven-patterns)
3. [Implementation Guide](#implementation-guide)
4. [Migration Strategy](#migration-strategy)
5. [Code Examples](#code-examples)
6. [Future Considerations](#future-considerations)

## Final Implementation

### Core Principle: **Environment as Optional Override**

Destinations use **real browser APIs by default**. Environments are only
provided for testing, simulation, or development scenarios.

```typescript
// ✅ Production usage (no env specified)
await destination.push(event, { config, mapping, data });
// Uses real window.gtag, window.dataLayer, document.createElement, etc.

// ✅ Testing usage (env specified)
await destination.push(event, { config, mapping, data, env: testEnv });
// Uses mock implementations from examples
```

### Proven Benefits

✅ **Zero Runtime Overhead** - Pure TypeScript types, no framework code  
✅ **Type Safety** - Full IntelliSense and compile-time checking  
✅ **Testing Simplification** - Reusable environments from examples folder  
✅ **Clean API** - Intuitive `examples.env.standard` pattern  
✅ **Performance** - Uses core's optimized `clone()` utility

## Proven Patterns

Based on successful implementation in gtag and plausible destinations:

### 1. **Environment Interface Pattern**

```typescript
// Each destination defines its specific environment
export interface Environment extends DestinationWeb.Environment {
  window: {
    gtag: Gtag.Gtag;
    dataLayer: unknown[];
  };
  document: {
    createElement: (tagName: string) => Element;
    head: { appendChild: (node: unknown) => void };
  };
}
```

### 2. **Named Export Pattern**

```typescript
// examples/env.ts - Direct named exports
export const init: Environment = {
  // Pre-initialization state
  window: { gtag: undefined, dataLayer: [] },
  // ...
};

export const standard: Environment = {
  // Standard mock environment
  window: { gtag: mockFn, dataLayer: [] },
  // ...
};
```

### 3. **Clean Usage Pattern**

```typescript
// Clean, discoverable API
import { examples } from '../index';
import { clone } from '@walkeros/core';

// Simple usage
const testEnv = examples.env.standard;

// With modifications
const mockEnv = clone(examples.env.standard);
mockEnv.window.gtag = jest.fn();
```

### 4. **No Default Environment**

````typescript
// ✅ Destinations export WITHOUT default env
export const destinationGtag: Destination = {
  type: 'google-gtag',
  config: { settings: {} },
  // NO env property - uses real browser APIs by default
  init({ config, env }) {
    const { window } = getEnvironment(env); // Falls back to real window
  }
};
``` ## Implementation Guide

### Step 1: Create Environment Interface

```typescript
// packages/web/destinations/{destination}/src/types/index.ts
import type { DestinationWeb } from '@walkeros/web-core';

export interface Environment extends DestinationWeb.Environment {
  window: {
    // Define exact APIs your destination uses
    gtag: Gtag.Gtag;
    dataLayer: unknown[];
  };
  document: {
    // Only include document methods you actually use
    createElement: (tagName: string) => Element;
    head: { appendChild: (node: unknown) => void };
  };
}
````

### Step 2: Remove Default Environment

```typescript
// packages/web/destinations/{destination}/src/index.ts
export const destinationExample: Destination = {
  type: 'example',
  config: { settings: {} },
  // ❌ REMOVE any default env property

  init({ config, env }) {
    // ✅ Use getEnvironment() - falls back to real browser APIs
    const { window, document } = getEnvironment(env);
    // ...
  },
};
```

### Step 3: Create Example Environments

```typescript
// packages/web/destinations/{destination}/src/examples/env.ts
import type { Environment } from '../types';

const noop = () => {};

export const init: Environment | undefined = {
  // Pre-initialization state (APIs not loaded yet)
  window: {
    gtag: undefined as unknown as Environment['window']['gtag'],
    dataLayer: [],
  },
  document: {
    createElement: () => ({
      src: '',
      setAttribute: noop,
      removeAttribute: noop,
    }),
    head: { appendChild: noop },
  },
};

export const standard: Environment = {
  // Standard mock environment for testing
  window: {
    gtag: Object.assign(noop, {
      // Add any specific properties if needed
    }) as unknown as Environment['window']['gtag'],
    dataLayer: [] as unknown[],
  },
  document: {
    createElement: () => ({
      src: '',
      setAttribute: noop,
      removeAttribute: noop,
    }),
    head: { appendChild: noop },
  },
};
```

### Step 4: Export from Examples Index

```typescript
// packages/web/destinations/{destination}/src/examples/index.ts
export * as env from './env';
export * as events from './events';
export * as mapping from './mapping';
```

### Step 5: Update Tests

````typescript
// packages/web/destinations/{destination}/src/__tests__/*.test.ts
import { examples } from '../index';
import { clone } from '@walkeros/core';

describe('Destination Tests', () => {
  const mockGtag = jest.fn();

  // ✅ Clean usage pattern
  const mockEnv = clone(examples.env.standard);
  mockEnv.window.gtag = mockGtag;

  // Or for call interception
  const testEnv = mockEnv(examples.env.standard, (path, args) => {
    calls.push({ path, args });
  });
});
``` ## Migration Strategy

### Priority Order (Based on Complexity)

**Phase 1: Simple Destinations** (1-2 weeks)
- API destination - Simple HTTP calls
- Console destination - Basic console.log mocking
- Webhook destination - HTTP endpoint calls

**Phase 2: Analytics Destinations** (2-3 weeks)
- Meta/Facebook Pixel - Similar to plausible pattern
- PiwikPro - Analytics destination pattern

**Phase 3: Complex Destinations** (2-3 weeks)
- BigQuery - Server SDK with complex initialization
- Additional Google/AWS destinations

### Naming Standardization

**Recommended Convention:**
- `standard` - Main mock environment for testing
- `init` - Pre-initialization state
- `error` - Error conditions (future)
- `offline` - Offline scenarios (future)

**Migration Rule:**
- Plausible's `push` should be renamed to `standard` for consistency

### Validation Checklist

For each destination migration:

- [ ] Environment interface extends platform-specific base
- [ ] No default `env` property in destination export
- [ ] Named exports in `examples/env.ts`
- [ ] Examples index exports `env` module
- [ ] Tests use `examples.env.standard` pattern
- [ ] Tests use `clone()` for modifications
- [ ] All tests pass
- [ ] Lint passes (no `any` types)

## Code Examples

### Working gtag Implementation

**Types:**
```typescript
export interface Environment extends DestinationWeb.Environment {
  window: {
    gtag: Gtag.Gtag;
    dataLayer: unknown[];
  };
  document: {
    createElement: (tagName: string) => Element;
    head: { appendChild: (node: unknown) => void };
  };
}
````

**Environment Examples:**

```typescript
export const standard: Environment = {
  window: {
    gtag: Object.assign(noop, {}) as unknown as Environment['window']['gtag'],
    dataLayer: [] as unknown[],
  },
  document: {
    createElement: () => ({
      src: '',
      setAttribute: noop,
      removeAttribute: noop,
    }),
    head: { appendChild: noop },
  },
};
```

**Test Usage:**

```typescript
import { examples } from '../index';
import { clone } from '@walkeros/core';

const mockEnv = clone(examples.env.standard);
mockEnv.window.gtag = jest.fn();
```

### Working Plausible Implementation

**Types:**

```typescript
export interface Environment extends DestinationWeb.Environment {
  window: {
    plausible: PlausibleAPI;
  };
  document: {
    createElement: () => Element;
    head: { appendChild: (node: unknown) => void };
    querySelector: () => Element | null;
  };
}
```

## Future Considerations

### Advanced Environment Scenarios

The current implementation supports `init` and `standard` scenarios. Future
expansion can add:

```typescript
export const error: Environment = {
  // Mock APIs that throw errors for testing error handling
};

export const offline: Environment = {
  // Mock APIs that simulate offline conditions
};

export const slow: Environment = {
  // Mock APIs with artificial delays for performance testing
};
```

### Tag Management Simulator

The standardized environment system enables future development of a
cross-platform simulator:

```typescript
class WalkerSimulator {
  async simulate(config: Config, event: Event): Promise<APICall[]> {
    // Uses standardized environments to intercept all calls
    // Can simulate both web and server destinations
    // Provides complete visibility into tag behavior
  }
}
```

### Server Destination Patterns

Future server destinations will follow similar patterns:

```typescript
// Server destination environment
export interface Environment extends DestinationServer.Environment {
  AWS: {
    FirehoseClient: typeof FirehoseClient;
    PutRecordBatchCommand: typeof PutRecordBatchCommand;
  };
}

// Example with constructor function mocking
export const standard: Environment = {
  AWS: {
    FirehoseClient: MockFirehoseClient as unknown as typeof FirehoseClient,
    PutRecordBatchCommand:
      MockCommand as unknown as typeof PutRecordBatchCommand,
  },
};
```

## Conclusion

The walkerOS Environment Standardization has been successfully implemented with
**production-ready patterns** proven across multiple destination types.

### Key Achievements

✅ **Zero Breaking Changes** - Backward compatible, destinations work normally
without env  
✅ **Type Safety** - Full TypeScript compliance with proper IntelliSense  
✅ **Clean API** - Intuitive `examples.env.standard` pattern  
✅ **Performance** - Zero runtime overhead, optimized deep cloning  
✅ **Testing Excellence** - Consistent, reusable mock environments  
✅ **Battle-Tested** - Validated with both simple and complex destinations

### Production Status: **🟢 READY FOR ECOSYSTEM ROLLOUT**

The patterns are mature, well-documented, and ready to be applied across all
remaining destinations. The implementation successfully delivers on all original
requirements while maintaining walkerOS's core principles of simplicity,
performance, and developer experience.

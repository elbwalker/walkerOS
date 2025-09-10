# Environment Dependency Management in walkerOS

## Problem Statement

### The Immediate Issue

The Plausible destination in our documentation shows "No function calls
captured" instead of displaying the expected `plausible()` function calls. This
happens because the documentation's function call interceptor cannot properly
mock the destination's dependencies.

### The Broader Challenge

Different destinations handle external dependencies inconsistently, making it
difficult to:

- Test destinations in isolation
- Display function calls in documentation
- Mock external services for development
- Potentially run server destinations in browser environments

## Current State Analysis

### How Destinations Access Dependencies

We have identified several patterns across our destinations:

#### Pattern 1: Direct Global Access (Problematic)

```typescript
// Plausible, Meta, PiwikPro, Gtag
push(event, { env }) {
  const { window } = getEnvironment(env); // Falls back to globalThis.window
  const plausible = window.plausible!;     // Direct global access
  plausible(event.name, data);
}
```

#### Pattern 2: Environment Injection (Works Well)

```typescript
// API destination
export const destinationAPI = {
  env: {
    sendWeb, // Injected dependency
  },

  push(event, { env }) {
    const { sendWeb } = env; // Uses injected dependency
    sendWeb(url, data);
  },
};
```

### Documentation Interceptor Mechanism

The documentation uses `createGenericInterceptor()` to capture function calls:

1. Creates a proxy from `destination.env`
2. Intercepts function calls on the proxy
3. Logs them for display

**Why Plausible Fails:**

- Plausible has no `env` property → interceptor gets `undefined`
- `getEnvironment(undefined)` falls back to real `globalThis.window`
- Real window has no intercepted functions → "No function calls captured"

**Why API Works:**

- API has `env: { sendWeb }` → interceptor creates proxy with `sendWeb`
- API calls `env.sendWeb()` directly → intercepted and logged

### External Dependencies by Destination

Based on our analysis, here are all external dependencies:

#### Web Destinations

- **Browser APIs**: `document.createElement`, `fetch`, `XMLHttpRequest`,
  `navigator.sendBeacon`
- **Third-party Globals**: `window.gtag`, `window.fbq`, `window.plausible`,
  `window._paq`, `window.dataLayer`
- **DOM Manipulation**: Script injection, element creation

#### Server Destinations

- **Node.js Built-ins**: `crypto.createHash`, `http`/`https` modules
- **External SDKs**: `@aws-sdk/client-firehose`, `@google-cloud/bigquery`
- **HTTP Clients**: Handled by SDKs or internal utilities

## Solution Options

### Option 1: Minimal Fix (Recommended for Now)

**Goal**: Fix documentation display with minimal changes

**Approach**: Add `env` property to destinations that need it

```typescript
// Before (Plausible)
export const destinationPlausible = {
  type: 'plausible',
  config: {},
  // No env property
};

// After (Plausible)
export const destinationPlausible = {
  type: 'plausible',
  config: {},
  env: {}, // Empty object allows interceptor to create proxy
};
```

**Benefits**:

- ✅ Minimal code changes
- ✅ Backward compatible
- ✅ Fixes documentation immediately
- ✅ No performance impact

**Limitations**:

- ❌ Still relies on global access in production
- ❌ No dependency injection benefits
- ❌ Limited testing capabilities

### Option 2: Environment Contracts (Future Enhancement)

**Goal**: Clean dependency injection for all destinations

**Approach**: Define environment contracts and update destinations

```typescript
// Define contracts
interface WebEnvironment {
  analytics: {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    plausible?: (...args: any[]) => void;
  };
  dom: {
    createElement: (tag: string) => HTMLElement;
    appendChild: (parent: Element, child: Element) => void;
  };
  http: {
    fetch: typeof fetch;
    sendBeacon: typeof navigator.sendBeacon;
  };
}

// Update destinations
export const destinationPlausible = {
  type: 'plausible',

  // Default environment for production
  env: {
    analytics: {
      get plausible() {
        return window.plausible;
      },
    },
  },

  push(event, { env }) {
    // Always use injected dependency
    env.analytics.plausible?.(event.name, data);
  },
};
```

**Benefits**:

- ✅ Clean dependency injection
- ✅ Easy to mock for testing
- ✅ Type-safe environment contracts
- ✅ Platform-agnostic destinations

**Limitations**:

- ❌ Requires rewriting all destinations
- ❌ More complex codebase
- ❌ Potential performance overhead

### Option 3: Universal Platform (Future Vision)

**Goal**: Write once, run anywhere with full cross-platform support

**Approach**: Abstract platform differences behind universal APIs

```typescript
interface UniversalEnvironment {
  analytics: {
    track: (provider: string, event: string, data: any) => void;
  };
  crypto: {
    hash: (data: string, algorithm: string) => Promise<string>;
  };
  network: {
    request: (options: RequestOptions) => Promise<Response>;
  };
}

// Server destinations could run in browser with Web Crypto API
class BrowserServerAdapter implements UniversalEnvironment {
  crypto = {
    hash: async (data, algorithm) => {
      // Use Web Crypto API instead of Node crypto
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
      return bufferToHex(hashBuffer);
    },
  };
}
```

**Benefits**:

- ✅ Server destinations in browser (for documentation!)
- ✅ Perfect testing isolation
- ✅ True platform independence
- ✅ Future-proof architecture

**Limitations**:

- ❌ Significant development effort
- ❌ Performance overhead
- ❌ May lose platform-specific optimizations

## Recommended Implementation Path

### Phase 0: Immediate Fix (This Week)

**Goal**: Fix Plausible documentation display

1. Add empty `env: {}` property to destinations that need it:
   - Plausible
   - Meta
   - PiwikPro
   - Gtag (if needed)

2. Update documentation interceptor to provide better mocks:
   - Ensure `window.plausible`, `window.fbq`, etc. are available on proxy

**Changes Required**:

- 4-5 destination files (add one line each)
- 1 documentation file update

### Phase 1: Environment Standardization (Future)

**Only if we decide to pursue dependency injection**

1. Define environment contracts in `@walkeros/core`
2. Update destinations to use injected dependencies
3. Create environment factories for different contexts
4. Update documentation and tests

### Phase 2: Universal Platform (Future Vision)

**Only if cross-platform execution becomes important**

1. Create universal adapter layer
2. Implement platform-specific adapters
3. Enable server destinations in browser
4. Build sophisticated testing framework

## Implementation Guide

### For the Immediate Fix

#### Step 1: Add env to destinations

```typescript
// In each destination that needs it
export const destinationPlausible: Destination = {
  type: 'plausible',
  config: {},
  env: {}, // Add this line

  // Rest unchanged
  init() {
    /* ... */
  },
  push() {
    /* ... */
  },
};
```

#### Step 2: Test in documentation

Visit the documentation page and verify function calls are captured.

#### Step 3: Optional - Enhance interceptor

```typescript
// In liveDestination.tsx
const createGenericInterceptor = (baseEnv: Destination.Environment = {}) => {
  // Ensure common analytics functions are available
  const enhancedEnv = {
    window: {
      plausible: (...args) =>
        capturedCalls.push(`plausible(${formatArgs(args)});`),
      fbq: (...args) => capturedCalls.push(`fbq(${formatArgs(args)});`),
      gtag: (...args) => capturedCalls.push(`gtag(${formatArgs(args)});`),
      ...baseEnv.window,
    },
    ...baseEnv,
  };

  return createProxy(enhancedEnv);
};
```

## Decision Framework

### When to Choose Option 1 (Minimal Fix)

- ✅ You just want documentation to work
- ✅ You prefer stability over features
- ✅ You want minimal maintenance overhead
- ✅ Current architecture serves your needs

### When to Choose Option 2 (Environment Contracts)

- ✅ You need better testing capabilities
- ✅ You want to eliminate global dependencies
- ✅ You're willing to refactor for long-term benefits
- ✅ Type safety is important to you

### When to Choose Option 3 (Universal Platform)

- ✅ You want server destinations in browser docs
- ✅ You're building a testing framework
- ✅ Platform independence is crucial
- ✅ You have development resources for ambitious features

## Conclusion

For our immediate needs, **Option 1 (Minimal Fix)** is recommended because:

1. **Solves the Problem**: Fixes Plausible documentation with minimal effort
2. **Low Risk**: Backward compatible, no breaking changes
3. **Fast Implementation**: Can be done in under an hour
4. **Reversible**: Doesn't prevent future enhancements

The more sophisticated options remain available for future implementation if we
decide the benefits justify the complexity.

## Next Steps

1. **Implement minimal fix** for Plausible and other affected destinations
2. **Verify documentation** works correctly
3. **Document the pattern** for future destinations
4. **Decide later** if we want to pursue more advanced dependency injection

This keeps us focused on solving the real problem without over-engineering the
solution.

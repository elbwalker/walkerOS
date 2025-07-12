# Enhanced Lean Wrapper System - Replace fn Implementation

## Overview

Replace the existing `fn` parameter with a flexible wrapper system that allows
destinations to capture behavior, enable dry runs, and support future
enhancements like mockReturn.

## Core Design Principles

✅ **Natural Syntax**: `const fbq = wrap('fbq', window.fbq);` ✅ **Flexible
Config**: Destructured parameters for dryRun, mockReturn, etc. ✅
**Callback-Based**: Custom handling via callback functions with context ✅
**Collector-Managed**: Collector creates and passes wrapper function

## Implementation Plan

### 1. Core Wrapper Utility (`packages/core/src/wrapper.ts`)

```typescript
interface WrapperContext {
  id: string; // destination id
  type: string; // destination type
  fnName: string; // original function name
}

export function createWrapper(
  destinationId: string,
  destinationType: string,
  {
    dryRun = false,
    mockReturn,
    onCall,
  }: {
    dryRun?: boolean;
    mockReturn?: unknown;
    onCall?: (context: WrapperContext, args: unknown[]) => void;
  } = {},
): (fnName: string, originalFn: Function) => Function {
  return (fnName: string, originalFn: Function) => {
    return (...args: unknown[]) => {
      const context: WrapperContext = {
        id: destinationId,
        type: destinationType,
        fnName,
      };

      // Call the callback if provided
      if (onCall) {
        onCall(context, args);
      }

      // Handle dry run
      if (dryRun) {
        return mockReturn;
      }

      // Execute original function
      return originalFn(...args);
    };
  };
}
```

### 2. Update Destination Types

```typescript
// packages/core/src/types/destination.ts

// Add wrapper config to destination config
interface Config<Settings = unknown, Mapping = unknown> {
  // ... existing properties
  wrapper?: {
    dryRun?: boolean;
    mockReturn?: unknown;
    onCall?: (context: WrapperContext, args: unknown[]) => void;
  };
  // Remove: fn?: (...args: unknown[]) => unknown;
}

// Add wrap function to context
interface PushContext<Settings = unknown, Mapping = unknown> {
  // ... existing properties
  wrap: (fnName: string, originalFn: Function) => Function;
}

interface InitContext<Settings = unknown, Mapping = unknown> {
  // ... existing properties
  wrap: (fnName: string, originalFn: Function) => Function;
}
```

**Note**: The separation is needed because:

- **Config**: Defines what wrapper behavior the user wants (dryRun, onCall,
  etc.)
- **Context**: Provides the actual wrap function that destinations use

### 3. Collector Integration

```typescript
// packages/core/src/destination.ts
import { createWrapper } from './wrapper';

// In destinationInit function
const initWrap = createWrapper(
  destination.config.id || 'unknown',
  destination.type || 'unknown',
  destination.config.wrapper || {},
);

const initContext: WalkerOSDestination.InitContext = {
  collector,
  config,
  data,
  wrap: initWrap,
};

// In destinationPush function
const pushWrap = createWrapper(
  destination.config.id || 'unknown',
  destination.type || 'unknown',
  destination.config.wrapper || {},
);

const pushContext: WalkerOSDestination.PushContext = {
  collector,
  config,
  data,
  mapping: eventMapping,
  wrap: pushWrap,
};
```

### 4. Update All Destinations (Natural Syntax)

**GA4 Example**:

```typescript
// Before
init({ config }) {
  const { settings, fn, loadScript } = config;
  const func = fn || window.gtag;
  func('js', new Date());
  func('config', measurementId, gtagSettings);
}

push(event, { config, mapping = {}, data }) {
  const { settings, fn } = config;
  const func = fn || window.gtag;
  func('event', eventName, eventParams);
}

// After
init({ config, wrap }) {
  const { settings, loadScript } = config;
  const gtag = wrap('gtag', window.gtag);
  gtag('js', new Date());
  gtag('config', measurementId, gtagSettings);
}

push(event, { config, mapping = {}, data, wrap }) {
  const { settings } = config;
  const gtag = wrap('gtag', window.gtag);
  gtag('event', eventName, eventParams);
}
```

**Meta Example**:

```typescript
// Before
init({ config }) {
  const { settings, fn, loadScript } = config;
  const func = fn || window.fbq;
  func('init', pixelId);
}

push(event, { config, mapping = {}, data }) {
  const { fn } = config;
  const func = fn || window.fbq;
  func('track', eventName, eventData);
}

// After
init({ config, wrap }) {
  const { settings, loadScript } = config;
  const fbq = wrap('fbq', window.fbq);
  fbq('init', pixelId);
}

push(event, { config, mapping = {}, data, wrap }) {
  const fbq = wrap('fbq', window.fbq);
  fbq('track', eventName, eventData);
}
```

**API Example**:

```typescript
// Before
push(event, { config, mapping = {}, data }) {
  const { settings, fn } = config;
  if (fn) fn(url, body, options);
  else sendWeb(url, body, options);
}

// After
push(event, { config, mapping = {}, data, wrap }) {
  const { settings } = config;
  const send = wrap('sendWeb', sendWeb);
  send(url, body, options);
}
```

### 5. Usage Examples

**Basic Dry Run**:

```typescript
elb('walker destination', destinationGA4, {
  id: 'ga4-main',
  type: 'google-ga4',
  settings: { measurementId: 'G-XXXXXXXXXX' },
  wrapper: {
    dryRun: true,
  },
});
```

**Custom Logging**:

```typescript
elb('walker destination', destinationGA4, {
  id: 'ga4-main',
  type: 'google-ga4',
  settings: { measurementId: 'G-XXXXXXXXXX' },
  wrapper: {
    onCall: (context, args) => {
      console.log(`[${context.id}:${context.type}] ${context.fnName}:`, args);
    },
  },
});
```

**Advanced Configuration**:

```typescript
elb('walker destination', destinationGA4, {
  id: 'ga4-main',
  type: 'google-ga4',
  settings: { measurementId: 'G-XXXXXXXXXX' },
  wrapper: {
    dryRun: true,
    mockReturn: { success: true },
    onCall: (context, args) => {
      // Custom analytics tracking
      analytics.track('destination_call', {
        destination: context.id,
        type: context.type,
        function: context.fnName,
        arguments: args,
      });
    },
  },
});
```

**Console Output Example**:

```
[ga4-main:google-ga4] gtag: ["event", "page_view", {"send_to": "G-XXXXXXXXXX"}]
[meta-pixel:meta] fbq: ["track", "PageView", {"content_name": "Homepage"}]
```

## Benefits of This Approach

✅ **Natural**: `const fbq = wrap('fbq', window.fbq);` reads like normal code ✅
**Flexible**: Destructured config supports future enhancements  
✅ **Extensible**: Custom onCall handlers with rich context ✅ **Clean**: No
hardcoded console.log or handling ✅ **Testable**: Easy to mock and test
destination behavior ✅ **Debuggable**: Clear callback-based debugging with
context

## Implementation Steps

1. **Create wrapper utility** - Core createWrapper function
2. **Update types** - Replace fn with wrapper config, add wrap to contexts
3. **Update core** - Collector creates wrapper and passes to contexts
4. **Update destinations** - Replace fn pattern with natural wrap syntax
5. **Update tests** - Replace fn tests with wrapper tests
6. **Clean up** - Remove fn from all examples and documentation

## Key Changes

- **Remove**: `fn?: (...args: unknown[]) => unknown;` from Config
- **Add**: `wrapper?: { dryRun?, mockReturn?, onCall? };` to Config
- **Add**: `wrap: (fnName: string, originalFn: Function) => Function;` to both
  InitContext and PushContext
- **Replace**: `const func = fn || window.gtag;` with
  `const gtag = wrap('gtag', window.gtag);`
- **Enhance**: Collector creates wrapper function and passes to destinations

This creates a natural, flexible, and extensible wrapper system that maintains
clean code while enabling powerful debugging and testing capabilities!

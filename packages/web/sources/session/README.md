# @walkeros/web-source-session

Standalone session detection and management for walkerOS.

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/session)
| [NPM](https://www.npmjs.com/package/@walkeros/web-source-session) |
[Documentation](https://www.walkeros.io/docs/sources/web/session)

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { sourceSession } from '@walkeros/web-source-session';

const { collector, elb } = await startFlow({
  sources: {
    browser: sourceBrowser,
    session: {
      code: sourceSession,
      config: {
        settings: {
          storage: true, // Enable persistent session storage
        },
      },
    },
  },
});
```

## Features

- **Session detection**: Automatic detection of new sessions based on
  navigation, referrer, and marketing parameters
- **Device tracking**: Persistent device ID across sessions (with consent)
- **Consent-aware**: Switches between window-only and storage-based sessions
  based on user consent
- **Composable**: Works alongside any source (browser, dataLayer, custom)

## Installation

```bash
npm install @walkeros/web-source-session
```

## Why Separate Session Source?

The session source was extracted from the browser source to enable:

1. **Composability**: Use session detection with any source, not just browser
2. **Single responsibility**: Browser source focuses on DOM events, session
   source on identity
3. **Flexibility**: Configure session independently from event capture
4. **Server-side ready**: Session logic can work with server sources too

## Configuration Reference

| Name             | Type                       | Description                                      | Default          |
| ---------------- | -------------------------- | ------------------------------------------------ | ---------------- |
| `storage`        | `boolean`                  | Enable persistent storage for session/device IDs | `false`          |
| `consent`        | `string \| string[]`       | Consent key(s) required to enable storage mode   | -                |
| `length`         | `number`                   | Session timeout in minutes                       | `30`             |
| `pulse`          | `boolean`                  | Keep session alive on each event                 | `false`          |
| `sessionKey`     | `string`                   | Storage key for session ID                       | `'elbSessionId'` |
| `sessionStorage` | `'local' \| 'session'`     | Storage type for session                         | `'local'`        |
| `deviceKey`      | `string`                   | Storage key for device ID                        | `'elbDeviceId'`  |
| `deviceStorage`  | `'local' \| 'session'`     | Storage type for device                          | `'local'`        |
| `cb`             | `SessionCallback \| false` | Custom callback or disable default               | -                |

## Examples

### Basic (Window-only)

No persistent storage, session detected per page load:

```typescript
const { elb } = await startFlow({
  sources: {
    browser: sourceBrowser,
    session: sourceSession, // Defaults to window-only mode
  },
});
```

### With Persistent Storage

Store session and device IDs in localStorage:

```typescript
const { elb } = await startFlow({
  sources: {
    browser: sourceBrowser,
    session: {
      code: sourceSession,
      config: {
        settings: {
          storage: true,
          length: 30, // 30-minute session timeout
        },
      },
    },
  },
});
```

### Consent-Aware

Switch to storage mode only when user grants consent:

```typescript
const { elb } = await startFlow({
  sources: {
    browser: sourceBrowser,
    session: {
      code: sourceSession,
      config: {
        settings: {
          consent: 'analytics', // Wait for analytics consent
          storage: true,
        },
      },
    },
  },
});

// Later, when user grants consent:
elb('walker consent', { analytics: true });
// Session source automatically switches to storage mode
```

## Session Start Event

When a new session is detected, the source pushes a `session start` event:

```typescript
{
  name: 'session start',
  data: {
    isStart: true,
    id: 'abc123',      // Session ID
    device: 'xyz789',  // Device ID (if storage enabled)
    storage: true,     // Whether storage mode is active
    // ... additional session metadata
  }
}
```

## Migration from Browser Source

If you were using the browser source with session enabled:

```typescript
// Before (browser source with built-in session)
const { elb } = await startFlow({
  sources: {
    browser: {
      code: sourceBrowser,
      config: { settings: { session: true } },
    },
  },
});

// After (separate session source)
const { elb } = await startFlow({
  sources: {
    browser: sourceBrowser,
    session: {
      code: sourceSession,
      config: { settings: { storage: true } },
    },
  },
});
```

## Exported Functions

The session source exports session functions for direct usage:

```typescript
import {
  // Session functions
  sessionStart,
  sessionWindow,
  sessionStorage,
} from '@walkeros/web-source-session';

// Use sessionStart directly (advanced usage)
const session = sessionStart({
  storage: true,
  collector: collectorInstance,
});
```

Storage utilities are available from `@walkeros/web-core`:

```typescript
import { storageRead, storageWrite, storageDelete } from '@walkeros/web-core';

storageWrite('key', 'value', 30); // 30-minute expiration
const value = storageRead('key');
storageDelete('key');
```

## Type Definitions

See [src/types/index.ts](./src/types/index.ts) for TypeScript interfaces.

## Related

- [Browser Source](/docs/sources/web/browser) - DOM-based event tracking
- [DataLayer Source](/docs/sources/web/dataLayer) - GTM/GA4 integration
- [Session Documentation](https://www.walkeros.io/docs/sources/web/session)

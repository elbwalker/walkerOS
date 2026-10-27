---
name: walkeros-using-logger
description:
  Use when working with walkerOS sources/destinations to understand standard
  logging patterns, replace console.log, or add logging to external API calls.
  Covers DRY principles, when to log, and migration patterns.
---

# Using the walkerOS Logger

## Overview

The logger is walkerOS's standard logging system, available in all sources and
destinations via `env.logger` or `logger` parameter. It provides scoped,
level-aware logging that replaces console.log.

**Core principle:** Don't log what the collector already logs, and never log a
failure yourself. A step reports a failure by throwing a `StepError`; the
collector writes the one ERROR line per cause. Log only meaningful operations
like external API calls and transformations, at `debug`.

## Logger Access

### In Sources

```typescript
export const sourceFetch: Source.Init<Types> = async (context) => {
  const { env } = context; // env.logger is available here
  // Logger is scoped automatically by collector: [type:sourceId]
  env.logger.info('Server listening on port 3000');
  // ... build and return the source instance
};
```

### In Destinations

```typescript
export const destinationDataManager: DestinationInterface = {
  async init({ config, env, logger }) {
    // logger parameter is scoped automatically: [datamanager]
    logger.debug('Auth client created');
  },

  async push(event, { config, data, env, logger }) {
    // logger parameter is scoped: [datamanager]
    logger.debug('API response', { status: 200 });
  },
};
```

**Note:** You don't need to create or configure the logger; it's provided
automatically with proper scoping.

## Logger Methods

```typescript
interface Logger.Instance {
  error(message: string | Error, context?: unknown | Error): void;
  warn(message: string | Error, context?: unknown | Error): void;
  info(message: string | Error, context?: unknown | Error): void;
  debug(message: string | Error, context?: unknown | Error): void;
  throw(message: string | Error, context?: unknown): never;
  json(data: unknown): void;
  scope(name: string): Logger.Instance;
}
```

### Log Levels

- **ERROR (0)**: the user's intent is not met (an event was not delivered, a
  setting has no effect)
- **WARN (1)**: walkerOS acted and the intent is still met
- **INFO (2)**: lifecycle and self-healing (server startup)
- **DEBUG (3)**: the per-event trace and deliberate decisions (API calls,
  transformations, a skipped event)

**Default**: ERROR only (must configure to see WARN/INFO/DEBUG)

### Context Parameter

All methods accept optional structured context:

```typescript
logger.debug('Sending to API', {
  endpoint: '/events',
  method: 'POST',
  eventCount: 5,
});
// Output: DEBUG [datamanager] Sending to API { endpoint: '/events', method: 'POST', eventCount: 5 }
```

## When to Log (and When NOT to)

### ❌ DON'T Log These (Collector Handles)

- **Init status**: "Initializing...", "Init started", "Init complete"
- **Push status**: "Processing event...", "Event received"
- **Generic status**: "Settings validated", "Config loaded"
- **Duplicate scoping**: Don't add source/dest name (already in scope)

**Why:** Collector can log these automatically since it calls init/push and has
scoped logger.

### ✅ DO Log These (Meaningful Operations)

- **External API calls**: Before/after with request/response details
- **Auth operations**: Token refresh, client creation/failures
- **Transformations**: Complex mappings or data processing
- **Notes that are not failures**: a deliberate decision, an advisory about
  configuration (`warn`: walkerOS acted, the intent is still met)
- **Never failures**: a missing setting, a failed request or an unsendable event
  is a thrown `StepError`, not a log line

## Usage Patterns

### Pattern 1: Validation Errors (Throw a StepError)

```typescript
import { StepError } from '@walkeros/core';

// ✅ GOOD - A missing setting is a failure: throw, never return or log
async init({ config }) {
  const { apiKey, projectId } = config.settings || {};

  if (!apiKey)
    throw new StepError('Config settings apiKey missing', { code: 'config' });

  if (!projectId)
    throw new StepError('Config settings projectId missing', {
      code: 'config',
    });
}
```

**Why a thrown StepError:**

- The collector turns the throw into a failed push (or a failed start), counts
  it, and writes **one** ERROR line per cause and minute with the code
- A step that also logged the failure would write a second line for the same
  cause
- `code` and `retryable` tell a server source whether to ask the producer to
  resend (`config`, `missing-input` and a 4xx are not retryable)
- `logger.throw` only throws. It writes no log line, so it is not a way to
  report a failure

Never `return` early from `init` or `push` instead of throwing: a step that
returns normally counts as started, and a push that returns normally counts as
delivered. `return false` from `init` fails the push with the code `not-ready`,
which does not name the missing setting.

### Pattern 2: External API Calls

```typescript
import { StepError } from '@walkeros/core';

// ✅ GOOD - Trace the call at debug, throw on a failure
async push(event, { config, logger }) {
  const endpoint = 'https://api.vendor.com/events';

  logger.debug('Calling API', { endpoint, method: 'POST', eventId: event.id });

  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(event),
  });

  logger.debug('API response', { status: response.status, ok: response.ok });

  if (!response.ok)
    // The status sets retryable (429 and 5xx retry, other 4xx do not). The
    // response body goes on `body`, never into the message, and never into a
    // log line.
    throw new StepError(`HTTP ${response.status}`, {
      code: 'transport',
      status: response.status,
      body: await response.text(),
    });
}
```

Prefer `sendWeb` / `sendServer`: they already throw a `StepError` with the
status and body.

### Pattern 3: Auth Operations

```typescript
import { StepError } from '@walkeros/core';

// ✅ GOOD - Trace the client creation, throw on failure
async init({ config, logger }) {
  try {
    const authClient = await createAuthClient(config.settings);
    logger.debug('Auth client created');
    return {
      env: { authClient },
    };
  } catch (error) {
    throw new StepError('Authentication failed', {
      code: 'config',
      cause: error,
    });
  }
}
```

The SDK's own message stays on `cause`, so a vendor error that carries personal
data never reaches a log line.

### Pattern 4: Server Startup (Sources)

```typescript
// ✅ GOOD - Log server listening (high-level info); routeLines lists one line
// per method and path the source serves
if (settings.port !== undefined) {
  server = app.listen(settings.port, () => {
    env.logger.info(
      `Express source listening on port ${settings.port}\n` + routeLines,
    );
  });
}
```

## Anti-Patterns (What NOT to Do)

### ❌ BAD: Verbose Init Logging

```typescript
async init({ logger }) {
  logger.debug('Data Manager init started'); // Redundant
  logger.info('Data Manager initializing...'); // Redundant
  logger.debug('Settings validated'); // Redundant

  const authClient = await createAuthClient();
  logger.debug('Auth client created'); // OK

  logger.info('Data Manager ready'); // Redundant
}
```

**Problem:** Collector knows when init is called. Only log meaningful operations
(auth client creation).

### ❌ BAD: Redundant Push Logging

```typescript
async push(event, { logger }) {
  logger.debug('Processing event', {
    // Redundant
    name: event.name,
    id: event.id,
  });

  // Do work...

  logger.info('Event processed'); // Redundant
}
```

**Problem:** Collector knows when push is called and can log automatically.

### ❌ BAD: Using console.log

```typescript
// ❌ NEVER use console.log in sources/destinations
console.log('Processing event:', event.name);

// ✅ Use logger instead
logger.debug('API call', { endpoint });
```

## Migration Checklist

When updating a source/destination to use the logger:

- [ ] Remove all `console.log`, `console.warn`, `console.error` statements
- [ ] Remove verbose init/push status logging (let collector handle)
- [ ] Throw a `StepError` with a `code` for every failure (apiKey missing,
      failed request, unsendable event); never log a failure and return
- [ ] Add `logger.debug` before external API calls (with endpoint, method)
- [ ] Add `logger.debug` after external API calls (with response status)
- [ ] Add `logger.debug` for auth operations (client creation, token refresh)
- [ ] Use structured context (objects) instead of string concatenation
- [ ] Verify tests still pass with logger mocked

## Testing with Logger

Use `createMockLogger` from `@walkeros/core` to check `debug` traces. To prove
that a failure is reported, start a real collector (`startFlow`), mock only the
network or the vendor global, and read the push result; a mocked collector
cannot see loss:

```typescript
import { startFlow } from '@walkeros/collector';

test('a missing apiKey fails the push', async () => {
  const { elb } = await startFlow({
    destinations: { vendor: { code: destination, config: { settings: {} } } },
  });

  const result = await elb({ name: 'page view' });

  expect(result.ok).toBe(false);
  expect(result.failed?.vendor.reason?.code).toBe('config');
});
```

## Log Level Configuration

Default log level is ERROR. To see INFO/DEBUG logs:

```typescript
import { startFlow } from '@walkeros/collector';

const { elb } = await startFlow({
  logger: {
    level: 'DEBUG', // Show all logs
  },
  destinations: {
    /* ... */
  },
});
```

**Levels:**

- `'ERROR'`: Only errors (default)
- `'WARN'`: Errors + warnings
- `'INFO'`: Errors + warnings + info
- `'DEBUG'`: Everything

The levels follow the contract under [Log Levels](#log-levels). A skipped event
writes a `DEBUG` line; a consent wait writes no line, and the push result lists
the destination under `queued` with the reason `consent`. Neither is a failure.

**Format:** on a server flow, `"collector": { "logger": { "format": "json" } }`
prints one JSON object per line (`severity`, `message`, `time`, `scope`,
`context`), which platforms such as Cloud Run read as structured logs. A web
flow rejects `format`. The flow's own handler and the runtime's handler both see
every line, so forwarding to a monitoring service needs no parsing.

## Related Skills

- [walkeros-understanding-destinations](../walkeros-understanding-destinations/SKILL.md) -
  Destination interface
- [walkeros-understanding-sources](../walkeros-understanding-sources/SKILL.md) -
  Source interface

**Key Files:**

- [packages/core/src/logger.ts](../../packages/core/src/logger.ts) - Logger
  implementation
- [packages/core/src/types/logger.ts](../../packages/core/src/types/logger.ts) -
  Logger types
- [packages/core/src/mockLogger.ts](../../packages/core/src/mockLogger.ts) -
  Testing utilities

## Choosing a level on public endpoints

A server source endpoint is exposed to the open internet. Level choice decides
whether ambient scanner noise turns into pages.

| Situation                                       | Level                  | Also                                                                                |
| ----------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| Unparseable body, oversized payload             | `debug`                | count on `collector.status.sources.<id>.rejected`                                   |
| Unknown path                                    | no line                | answered `404`                                                                      |
| Event the collector rejects as invalid          | `warn` with the reason | counted as `rejected`; answered 400 only when the source waits for delivery         |
| Settled `ok: false` arriving after the HTTP ack | `debug`                | the collector's failure line reports the cause at `error`; the ack already went out |
| Handler fault, rejected push promise            | `error`                | answered 500                                                                        |

Rules that follow from the table:

- **Never `error` for anything a stranger can trigger.** On Cloud Run an
  error-level stack trace on stderr opens an Error Reporting issue, so scanner
  traffic becomes an alert.
- **Do not duplicate the collector's error logs.** The collector already logs
  thrown pipeline failures at error. A source that logs them again doubles every
  real fault.
- **A rejected push and a settled `ok: false` are different things.** If a
  helper collapses both into one return shape, log the thrown case inside that
  helper at error, because the call site can no longer tell them apart.

Reference pattern: `packages/server/sources/express/src/index.ts`, the
error-boundary middleware for body-parser failures and the 400/500 split in the
synchronous POST branch.

**Best Practice Examples:**

- [packages/server/destinations/datamanager/src/push.ts](../../packages/server/destinations/datamanager/src/push.ts) -
  API logging patterns
- [packages/server/sources/express/src/index.ts](../../packages/server/sources/express/src/index.ts) -
  Server startup logging

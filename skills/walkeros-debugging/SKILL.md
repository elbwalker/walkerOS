---
name: walkeros-debugging
description:
  Use when walkerOS events aren't reaching destinations, debugging event flow,
  or troubleshooting mapping issues. Covers common problems and debugging
  strategies.
---

# Debugging walkerOS Events

## Quick Diagnosis

| Symptom                            | Likely Cause                 | Check                                    |
| ---------------------------------- | ---------------------------- | ---------------------------------------- |
| No events at all                   | Source not initialized       | Console for errors, verify `startFlow()` |
| Events fire but destination silent | Mapping mismatch             | Event name matches mapping?              |
| Partial data missing               | Path doesn't exist           | Log event structure, check nested paths  |
| Consent blocking                   | Required consent not granted | Check `consent` config, grant consent    |
| Destination error                  | Vendor API issue             | Check network tab, vendor console        |

## Debugging Strategies

### 1. Console Logging

**Log all events at collector level:**

```typescript
import { startFlow } from '@walkeros/collector';

const { elb } = await startFlow({
  destinations: {
    debug: {
      push: async (event, context) => {
        console.log('[walkerOS Event]', {
          name: event.name,
          data: event.data,
          context: event.context,
          consent: event.consent,
          timestamp: event.timestamp,
        });
      },
      config: {},
    },
    // ... other destinations
  },
});
```

### 2. Network Tab Inspection

For destinations that make HTTP calls:

1. Open DevTools → Network tab
2. Filter by destination domain (e.g., `google-analytics.com`, `facebook.com`)
3. Trigger event
4. Inspect request payload

**What to look for:**

- Request being made at all?
- Correct endpoint URL?
- Payload structure matches vendor spec?

### 3. Vendor Debug Tools

| Vendor    | Debug Tool                                                                                    |
| --------- | --------------------------------------------------------------------------------------------- |
| GA4       | [GA4 DebugView](https://support.google.com/analytics/answer/7201382)                          |
| Meta      | [Facebook Pixel Helper](https://developers.facebook.com/docs/meta-pixel/support/pixel-helper) |
| Plausible | [Plausible Dashboard real-time](https://plausible.io/docs)                                    |

### 4. Dry Run Mode

Test mapping without sending to vendor:

```typescript
const destination = {
  ...actualDestination,
  config: {
    ...actualDestination.config,
    dryRun: true, // Events processed but not sent
  },
};
```

## Common Issues

### Event Name Mismatch

**Problem:** Event fires but destination doesn't receive it.

```typescript
// Event pushed
elb('product view', { id: 'P123' });

// Mapping expects different name
mapping: {
  Product: {
    // Wrong: capital P
    View: {
      // Wrong: capital V
      name: 'view_item';
    }
  }
}
```

**Fix:** Event names are case-sensitive. Use exact match:

```typescript
mapping: {
  product: {
    view: {
      name: 'view_item';
    }
  }
}
```

### Missing Nested Data

**Problem:** `items` array is empty in destination.

```typescript
// Event structure
{
  name: 'order complete',
  data: { total: 100 },
  nested: [
    { entity: 'product', data: { id: 'P1' } }
  ]
}

// Mapping tries wrong path
data: {
  map: {
    items: {
      loop: [
        'data.items',  // Wrong: nested is at root, not in data
        { map: { id: 'data.id' } }
      ]
    }
  }
}
```

**Fix:** Use correct path to nested array:

```typescript
items: {
  loop: [
    'nested', // Correct: root-level nested
    { map: { item_id: 'data.id' } },
  ];
}
```

### Consent Blocking Events

**Problem:** Events not reaching destination.

**Check 1:** Does destination require consent?

```typescript
// Destination config
config: {
  consent: {
    marketing: true;
  } // Requires marketing consent
}
```

**Check 2:** Is consent granted?

```typescript
// Check current consent state
console.log(event.consent);

// Grant consent
elb('walker consent', { marketing: true });
```

### Simulated Destination Recorded Nothing: Pending vs Consent Skip

`walkeros push flow.json -e event.json --simulate destination.X` prints why a
destination sent nothing, from the collector's own records (`--json` and MCP:
`skipped` on the result):

| Line (`skipped`)                                                                                         | Meaning                                                                    | Fix in simulate                                                  |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `pending: waits for consent (require)` (`{ reason: 'pending', require: ['consent'] }`)                   | `require: ["consent"]`: never started, no consent state exists             | `--consent '{"functional":true}'` (MCP `state.consent`)          |
| `skipped: consent (requires marketing; granted functional)` (`{ reason: 'consent', required, granted }`) | Started, but `config.consent` denied the event (collector + event consent) | Grant the key in `--consent` or the event's `consent`            |
| `mapping: none (skipped before mapping)`, no `skipped` line                                              | Not consent: a filter, a `before` chain stop, or an error                  | Check `--verbose` logs, the `before` chain and the mapping rules |

`require` checks that consent state is present at all; `config.consent` checks
each event's keys. `--consent` is the collector's starting state: any value
clears the consent `require`, and its granted keys feed the consent check. A
`require` other than consent (e.g. `user`) cannot be seeded by simulate.

### Does the CMP Source Send Consent?

Simulate the CMP source with its own example (`in` plus `trigger` as
`{ content, trigger }`). The consent command it issues is recorded as an `elb`
call:

```
success: true
  source.usercentrics
    call elb("walker consent",{"functional":true,"marketing":true})
    no events
```

No `call elb("walker consent",...)` means the CMP source published nothing for
that input (for example `explicitOnly` with only implicit defaults), so
destinations waiting for consent stay pending in the real flow. `--consent` does
not help here: it is the collector's starting state and is never recorded as the
source's call. For a consent-gated source (the session source with
`settings.consent`), `no events` without `--consent` is expected; pass
`--consent '{"functional":true}'` (MCP `state.consent`) to see what it emits.

### Vendor SDK Not Loaded

**Problem:** `TypeError: env.window.gtag is not a function`

**Cause:** Vendor script not loaded before push.

**Fix:** Ensure init() loads script:

```typescript
init: async (config, env) => {
  // Wait for script to load
  await loadScript('https://vendor.com/sdk.js');
  // Verify SDK available
  if (!env.window.vendorSdk) {
    throw new Error('Vendor SDK failed to load');
  }
},
```

### Function Mapping Errors

**Problem:** `Cannot read property 'price' of undefined`

```typescript
// Mapping with unsafe access
data: {
  map: {
    value: {
      fn: (e) => e.data.price * 100;
    } // Fails if data.price undefined
  }
}
```

**Fix:** Add null checks:

```typescript
value: {
  fn: (e) => (e.data?.price ?? 0) * 100;
}
```

## Debugging Checklist

When events aren't working:

1. [ ] **Console errors?** Check browser console for exceptions
2. [ ] **Event pushed?** Add debug destination to log all events
3. [ ] **Mapping matched?** Verify entity/action names exactly match
4. [ ] **Data paths correct?** Log full event structure, verify paths exist
5. [ ] **Consent granted?** Check consent requirements and state
6. [ ] **SDK loaded?** Verify vendor script loaded before push
7. [ ] **Network request?** Check DevTools network tab
8. [ ] **Vendor receiving?** Use vendor debug tools

## Testing in Isolation

Test destination push directly:

```typescript
import { push } from '@walkeros/web-destination-gtag';
import { mockEnv } from '@walkeros/core';

// Create test event
const event = {
  name: 'product view',
  data: { id: 'P123', price: 99 },
  // ... full event
};

// Mock env to capture calls
const calls = [];
const testEnv = mockEnv(baseEnv, (path, args) => {
  calls.push({ path, args });
});

// Test push directly
await push(event, { config: testConfig, env: testEnv });

// Inspect what was called
console.log(calls);
```

## MCP Tool Debugging

When using walkerOS MCP tools, check `_hints.warnings` in tool responses for
diagnostic information:

- **`flow_simulate`** warns when 0 destinations exist or none received the
  event; a destination that sent nothing carries `skipped` (pending on its
  `require`, or a consent skip) and the warning says which. Pass `state.consent`
  to start a destination that waits for consent. `step` is required (e.g.
  `"destination.gtag"`). Source steps take a `{ content, trigger? }` event where
  `content` is `{ name, data }`; sources, including `@walkeros/source-demo`, can
  be simulated this way. A source result shows the source's own walker commands
  as `elb` calls (no `verbose` needed) and its summary counts them
  (`Source captured 0 events and 1 command`); `state.consent` applies to source
  steps too.
- **`flow_bundle`** warns when the build produces no output
- **`flow_examples`** warns when no examples are found in the config
- **`package_search`** returns the complete catalog and warns (via the
  `warnings` array) when it falls back to a partial source or omits packages,
  instead of silently returning a partial list
- All error responses include a `hint` field with recovery suggestions

When a request fails or behaves unexpectedly, call **`diagnostics`** (read-only,
no parameters, works logged out). It reports the MCP and CLI versions, the
resolved app URL and whether it came from `WALKEROS_APP_URL` or the default, app
`/api/health` reachability, the bundled OpenAPI contract version, and which
source served the last package lookup, so you can tell which backend and
versions you are on.

## Related Skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) - Event
  flow architecture
- [walkeros-understanding-destinations](../walkeros-understanding-destinations/SKILL.md) -
  Destination interface
- [walkeros-mapping-configuration](../walkeros-mapping-configuration/SKILL.md) -
  Mapping recipes

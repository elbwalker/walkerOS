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
      code: {
        type: 'debug',
        config: {},
        push: async (event) => {
          console.log('[walkerOS Event]', {
            name: event.name,
            data: event.data,
            context: event.context,
            consent: event.consent,
            timestamp: event.timestamp,
          });
        },
      },
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

### 4. Simulate or Mock the Destination

To see what a destination's mapping produces without calling the vendor,
simulate it: the vendor calls are recorded on a mock env instead of sent.

```bash
walkeros push flow.json -e event.json --simulate destination.ga4
```

`config.mock` (`"mock": true` in the destination's `config`) replaces only the
destination's `push` call with that value: the mapping still runs, `init` still
runs (it may load the vendor script and make its init calls), and the push
answers with the mock value instead of calling the vendor.

## Common Issues

### Event Name Mismatch

**Problem:** Event fires but destination doesn't receive it.

```typescript
// Event pushed
elb({ name: 'product view', data: { id: 'P123' } });

// Mapping expects a different name
const mapping = {
  Product: {
    // Wrong: capital P
    View: { name: 'view_item' }, // Wrong: capital V
  },
};
```

**Fix:** Event names are case-sensitive. Use exact match:

```typescript
const mapping = {
  product: {
    view: { name: 'view_item' },
  },
};
```

### Missing Nested Data

**Problem:** `items` array is empty in destination.

```typescript
// Event structure
const event = {
  name: 'order complete',
  data: { value: 100 },
  nested: [{ entity: 'product', data: { id: 'P1' } }],
};

// Mapping tries wrong path
const rule = {
  data: {
    map: {
      items: {
        loop: [
          'data.items', // Wrong: nested is at root, not in data
          { map: { id: 'data.id' } },
        ],
      },
    },
  },
};
```

**Fix:** Use correct path to nested array:

```typescript
const items = {
  loop: [
    'nested', // Correct: root-level nested
    { map: { item_id: 'data.id' } },
  ],
};
```

### Consent Blocking Events

**Problem:** Events not reaching destination.

**Check 1:** Does destination require consent?

```typescript
// Destination config
const config = {
  consent: { marketing: true }, // Requires marketing consent
};
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

| Line (`skipped`)                                                                                         | Meaning                                                                            | Fix in simulate                                                                              |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pending: waits for consent (require)` (`{ reason: 'pending', require: ['consent'] }`)                   | `require: ["consent"]`: never started, no consent state exists                     | `--consent '{"functional":true}'` (MCP `state.consent`)                                      |
| `skipped: consent (requires marketing; granted functional)` (`{ reason: 'consent', required, granted }`) | Started, but `config.consent` denied the event (collector + event consent)         | Grant the key in `--consent` or the event's `consent`                                        |
| `mapping: none (skipped before mapping)`, no `skipped` line                                              | Not consent: an event without `name`, a filter, a `before` chain stop, or an error | Check the event has a `name`, the `--verbose` logs, the `before` chain and the mapping rules |

`require` checks that consent state is present at all; `config.consent` checks
each event's keys. `--consent` is the collector's starting state: any value
clears the consent `require`, and its granted keys feed the consent check. A
`require` other than consent (e.g. `user`) cannot be seeded by simulate.

An event without `name` sends nothing and the simulation still answers
`success: true` with `mapping: none (skipped before mapping)` and `no calls`,
while a real push of it answers `ok: false` with `Event name is required`.

### Does the CMP Source Send Consent?

Simulate the CMP source with its own example (`in` plus `trigger` as
`{ content, trigger }`). The consent command it issues is recorded as an `elb`
call:

```
success: true
  source.usercentrics
    call elb("walker consent",{"essential":true,"functional":true,"marketing":true})
    no events
```

No `call elb("walker consent",...)` means the CMP source published nothing for
that input (for example `explicitOnly` with only implicit defaults), so
destinations waiting for consent stay pending in the real flow. `--consent` does
not help here: it is the collector's starting state and is never recorded as the
source's call. For a consent-gated source (the session source with
`settings.consent`), `no events` without `--consent` is expected; pass
`--consent '{"functional":true}'` (MCP `state.consent`) to see what it emits.

### `startFlow` Throws `Cannot read properties of undefined (reading 'config')`

A `destinations` entry without `code` (for example `{ push, config }` written
directly) makes `startFlow` throw this `TypeError`, which names neither the
destination nor `code`. Put the destination instance under `code`, as in
"Console Logging" above.

### Vendor SDK Not Loaded

**Problem:** the push fails with `vendor-not-loaded`
(`Vendor script failed to load`), `vendor-not-ready`
(`Vendor not ready: its global is missing`) or `vendor-timeout`, or the vendor
receives nothing although the push answers `done`.

**Cause:** the vendor script was blocked, did not load in time, or was never
injected: a web destination that loads its vendor script (gtag, Meta, Plausible
and others) injects it only with `config.loadScript: true`. Without it nothing
is injected, and gtag's calls wait in `dataLayer` while the push answers `done`.

**Fix:** set `"loadScript": true` in the destination's `config`, or keep the
vendor's own tag on the page. A destination package loads its script through
`loadVendor` from `@walkeros/web-core`, which reports the codes above instead of
losing events (see
[create-destination](../walkeros-create-destination/SKILL.md), Phase 7, "Scripts
through `loadVendor`").

### Function Mapping Errors

**Problem:** the log shows
`ERROR mapping fn failed { step: 'mapping.product view', code: 'mapping', ... error: "Cannot read properties of undefined (reading 'price')" }`,
and the destination receives the event without that field.

```json
{
  "data": {
    "map": {
      "value": {
        "fn": "$code:(value, { event }) => event.data.product.price * 100"
      }
    }
  }
}
```

The function fails when the event has no `data.product`. A function that returns
`NaN` instead (for example `event.data.price * 100` on an event without a price)
drops the field with no log line at all.

**Fix:** Read the event through optional chaining and a fallback, which avoids
both:

```json
{
  "data": {
    "map": {
      "value": {
        "fn": "$code:(value, { event }) => (event.data?.product?.price ?? 0) * 100"
      }
    }
  }
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

Run one destination on a real collector and record its vendor calls through
`env` instead of loading the vendor script:

```typescript
import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationGtag } from '@walkeros/web-destination-gtag';

// Record every gtag() call instead of loading gtag.js
const calls: unknown[][] = [];
const { elb } = await startFlow({
  destinations: {
    ga4: {
      code: destinationGtag,
      config: {
        settings: { ga4: { measurementId: 'G-XXXXXXXXXX' } },
        mapping: {
          product: {
            view: { name: 'view_item', data: { map: { value: 'data.price' } } },
          },
        },
      },
      env: {
        window: {
          dataLayer: [],
          gtag: (...args: unknown[]) => calls.push(args),
        },
      },
    },
  },
});

const result = await elb(getEvent('product view'));
console.log(result.ok, calls);
// true [['config', 'G-XXXXXXXXXX', {}], ['event', 'view_item', { value: 420, send_to: 'G-XXXXXXXXXX' }]]
```

The CLI does the same for a flow file:
`walkeros push flow.json -e event.json --simulate destination.ga4`.

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
- **`flow_bundle`** with `stats: false` still writes the bundle, but its result
  reads `success: false` and `Bundle produced no output`
- **`flow_examples`** warns when no examples are found in the config
- **`package_search`** browses the published step packages whose walkerOS
  metadata it could read. When the npm search fails, the catalog is empty and a
  warning says so; a second warning counts the npm packages without readable
  walkerOS metadata, which includes every package that is not a step, so it
  appears on every browse
- Error responses carry `error` and, where the tool knows a recovery, a `hint`

From a terminal, `walkeros diagnostics` reports the CLI version, the app URL
(and whether it came from `WALKEROS_APP_URL`, the config file or the default),
and whether the app answers its health route.

## Related Skills

- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) - Event
  flow architecture
- [walkeros-understanding-destinations](../walkeros-understanding-destinations/SKILL.md) -
  Destination interface
- [walkeros-mapping-configuration](../walkeros-mapping-configuration/SKILL.md) -
  Mapping recipes

# @walkeros/web-destination-optimizely

Optimizely Feature Experimentation web destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Forwards conversion events to
Optimizely via the official `@optimizely/optimizely-sdk` v6 modular API with
support for revenue/value event tags, user targeting attributes, and
consent-based client lifecycle.

## Installation

```bash
npm install @walkeros/web-destination-optimizely
```

## Quick Start

```json
{
  "destinations": {
    "optimizely": {
      "package": "@walkeros/web-destination-optimizely",
      "config": {
        "consent": { "analytics": true },
        "settings": {
          "sdkKey": "YOUR_SDK_KEY",
          "userId": "user.id"
        }
      }
    }
  }
}
```

Programmatic:

```ts
import { startFlow } from '@walkeros/collector';
import destinationOptimizely from '@walkeros/web-destination-optimizely';

const { elb } = await startFlow();

elb('walker destination', destinationOptimizely, {
  consent: { analytics: true },
  settings: {
    sdkKey: 'YOUR_SDK_KEY',
    userId: 'user.id',
  },
});
```

## Settings

| Key              | Type      | Default | Description                                                                                               |
| ---------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `sdkKey`         | `string`  | —       | Required. Optimizely Feature Experimentation SDK key (Settings > Environments).                           |
| `userId`         | `Mapping` | —       | walkerOS mapping value resolving to the userId used for bucketing (e.g. `"user.id"`). Required per event. |
| `attributes`     | `Mapping` | —       | Destination-level user attributes for audience targeting. Applied via `createUserContext()`.              |
| `updateInterval` | `number`  | `60000` | Datafile polling interval (ms).                                                                           |
| `autoUpdate`     | `boolean` | `true`  | Poll for datafile updates.                                                                                |
| `batchSize`      | `number`  | `10`    | Events per batch (batch event processor).                                                                 |
| `flushInterval`  | `number`  | `1000`  | Batch flush interval (ms).                                                                                |
| `skipOdp`        | `boolean` | `true`  | Skip Optimizely Data Platform manager init.                                                               |

## Mapping

Per-rule overrides under `mapping.<entity>.<action>.settings`:

| Key          | Type      | Description                                                                             |
| ------------ | --------- | --------------------------------------------------------------------------------------- |
| `eventKey`   | `string`  | Override event key sent to Optimizely. If omitted, the walkerOS event name is used.     |
| `revenue`    | `Mapping` | Resolves to integer cents. Passed as `eventTags.revenue`.                               |
| `value`      | `Mapping` | Resolves to a float. Passed as `eventTags.value`.                                       |
| `eventTags`  | `Mapping` | Extra tags. Spread into the `eventTags` object.                                         |
| `attributes` | `Mapping` | Per-event user attributes. Applied via `setAttribute()` before the `trackEvent()` call. |

Use `rule.name` to rename the event key and `rule.skip = true` to fire
attributes without a `trackEvent()` call.

## Revenue

Optimizely expects revenue as an **integer in cents** (e.g. `7281` = `$72.81`).
The destination passes the resolved value through without conversion — you must
provide cents.

```json
{
  "order": {
    "complete": {
      "name": "purchase",
      "settings": {
        "revenue": "data.revenue_cents",
        "value": "data.total"
      }
    }
  }
}
```

## Consent

Two layers:

1. **`config.consent`** — walkerOS gates delivery. Events are queued until
   required consent keys resolve to `true`.
2. **`on('consent')`** — the destination closes the Optimizely client (flushing
   queued events and stopping polling) when any required key flips to `false`.
   On re-grant, the next push re-initializes the client.

```json
"config": { "consent": { "analytics": true } }
```

## Decide / Feature Flags

This destination intentionally does **not** expose `decide()` — experiment
decisions belong in application code where UI branching happens. This package
covers the outbound conversion-tracking use case.

## License

MIT

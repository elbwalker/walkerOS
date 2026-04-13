<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Amplitude Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/amplitude)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-amplitude)
&bull; [Documentation](https://www.walkeros.io/docs/destinations/web/amplitude)

This package forwards walkerOS events to [Amplitude](https://amplitude.com/) —
product analytics with identity, revenue, groups, and optional session replay,
experiments, and guides & surveys. Built on the official
[`@amplitude/unified`](https://www.npmjs.com/package/@amplitude/unified) SDK
which bundles analytics, session replay, experiments, and engagement.

walkerOS follows a **source → collector → destination** architecture. This
Amplitude destination receives processed events from the walkerOS collector and
forwards them as Amplitude track, identify, revenue, group, and consent calls.

## Features

- **Default event forwarding** — every walkerOS event becomes
  `amplitude.track(name, event_properties)` with no additional config
- **Custom event properties** — flatten walkerOS event sections
  (`settings.include`) or map freely via the standard walkerOS `mapping.data`
  DSL
- **Identity** — destination-level and per-event `settings.identify` with the
  full Amplitude operation vocabulary (`set`, `setOnce`, `add`, `append`,
  `prepend`, `preInsert`, `postInsert`, `remove`, `unset`, `clearAll`). Runtime
  state diffing skips redundant setter calls.
- **Revenue** — `settings.revenue` supports both single-object and `loop`-based
  multi-product orders. Currency defaults to `"EUR"`.
- **Groups** — `settings.group` and `settings.groupIdentify` for B2B flows
- **Consent** — `on('consent')` handler derives the consent keys from
  `config.consent` and toggles `amplitude.setOptOut()`
- **Optional plugins** (all npm-bundled via `@amplitude/unified`, opt-in via
  settings): Session Replay, Feature Experiments, Engagement (Guides & Surveys)
- **Async init** — awaits `amplitude.initAll(...)` so downstream pushes are
  truly ready before returning

> **Bundle cost:** All three plugin packages are statically imported and
> therefore bundled even when not configured. Expect an additional ~135 KB from
> Session Replay plus the Experiment and Engagement payloads.

## Installation

```sh
npm install @walkeros/web-destination-amplitude
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationAmplitude } from '@walkeros/web-destination-amplitude';

await startFlow({
  destinations: {
    amplitude: {
      code: destinationAmplitude,
      config: {
        consent: { analytics: true },
        settings: {
          apiKey: 'YOUR_AMPLITUDE_API_KEY',
        },
      },
    },
  },
});
```

## Configuration

### Settings (destination-level)

All fields of Amplitude's `BrowserOptions` pass through to
`amplitude.init(apiKey, options)`. walkerOS-specific additions:

| Name            | Type                                 | Description                                                                                                                               | Required |
| --------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `apiKey`        | `string`                             | Your Amplitude project API key                                                                                                            | Yes      |
| `identify`      | `Mapping.Value`                      | Destination-level identity mapping; see Identity section                                                                                  | No       |
| `include`       | `string[]`                           | walkerOS event sections to flatten into `event_properties` (`data`, `globals`, `context`, `user`, `source`, `version`, `event`, or `all`) | No       |
| `sessionReplay` | `SessionReplayOptions`               | If set, enables session replay via `@amplitude/unified` with these options                                                                | No       |
| `experiment`    | `ExperimentConfig` + `deploymentKey` | If `deploymentKey` set, configures the experiment plugin from `@amplitude/unified`                                                        | No       |
| `engagement`    | `boolean \| InitOptions`             | Pass `true` for default Guides & Surveys plugin, or an options object                                                                     | No       |

### Mapping (`rule.settings`)

| Name            | Type                       | Description                                                                                                                                                                                                                        |
| --------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identify`      | `Mapping.Value`            | Per-event identity; resolves to an object with any of `user`, `device`, `session`, `set`, `setOnce`, `add`, `append`, `prepend`, `preInsert`, `postInsert`, `remove`, `unset`, `clearAll`                                          |
| `include`       | `string[]`                 | Overrides destination-level `include` for this rule                                                                                                                                                                                |
| `revenue`       | `Mapping.Value`            | Resolves to a single object or (via `loop`) an array, each with `productId`, `price`, `quantity`, `revenueType`, `currency`, `revenue`, `receipt`, `receiptSig`, `eventProperties`. One `amplitude.revenue()` call fires per item. |
| `group`         | `Mapping.Value`            | Resolves to `{ type, name }` → `amplitude.setGroup(type, name)`                                                                                                                                                                    |
| `groupIdentify` | `Mapping.Value`            | Resolves to `{ type, name, set?, setOnce?, ... }` → `amplitude.groupIdentify(type, name, identify)`                                                                                                                                |
| `reset`         | `boolean \| Mapping.Value` | Truthy → `amplitude.reset()` (logout). Typically paired with `skip: true`.                                                                                                                                                         |

## Custom Event Properties

```typescript
// Flatten walkerOS sections onto every tracked event (prefixed).
settings: {
  apiKey: 'YOUR_KEY',
  include: ['data', 'globals'],
}
// → amplitude.track('product view', { data_id: 'ers', data_price: 420, globals_pagegroup: 'shop' })
```

Per-rule override via `mapping.settings.include` replaces destination-level
`include` for the matched rule.

## Identity

```typescript
mapping: {
  user: {
    login: {
      skip: true, // suppress default track()
      settings: {
        identify: {
          map: {
            user: 'data.user_id',
            set: { map: { plan: 'data.plan', email: 'data.email' } },
            setOnce: { map: { first_login: 'timestamp' } },
            add: { map: { login_count: { value: 1 } } },
          },
        },
      },
    },
  },
}
```

- `user` → `amplitude.setUserId(...)` (with state diffing)
- `device` → `amplitude.setDeviceId(...)`
- `session` → `amplitude.setSessionId(...)` (numeric strings parse; other
  strings are deterministically hashed via djb2 for cross-page-load consistency)
- The remaining operation keys are forwarded through `amplitude.Identify` and
  `amplitude.identify(...)`

## Revenue

```typescript
// Single-product renewal
mapping: {
  subscription: {
    renew: {
      skip: true,
      settings: {
        revenue: {
          map: {
            productId: 'data.plan_id',
            price: 'data.amount',
            revenueType: { value: 'renewal' },
            currency: { key: 'data.currency', value: 'EUR' },
          },
        },
      },
    },
  },
}

// Multi-product order via loop
mapping: {
  order: {
    complete: {
      settings: {
        include: ['data'],
        revenue: {
          loop: ['nested', {
            condition: (v) => typeof v?.data?.price === 'number',
            map: {
              productId: 'data.id',
              price: 'data.price',
              quantity: { key: 'data.quantity', value: 1 },
              revenueType: { value: 'purchase' },
              currency: { key: 'data.currency', value: 'EUR' },
            },
          }],
        },
      },
    },
  },
}
```

Every item from the loop becomes its own `amplitude.revenue()` call; the default
`track()` still fires once for the order-level event.

## Groups

```typescript
settings: {
  group: {
    map: { type: { value: 'company' }, name: 'data.company' },
  },
  groupIdentify: {
    map: {
      type: { value: 'company' },
      name: 'data.company',
      set: { map: { industry: 'data.industry' } },
    },
  },
}
// → amplitude.setGroup('company', 'Acme')
// → amplitude.groupIdentify('company', 'Acme', identify)
```

## Reset (Logout)

```typescript
mapping: {
  user: {
    logout: {
      skip: true,
      settings: { reset: true },
    },
  },
}
// → amplitude.reset()
```

Clears the Amplitude user ID and regenerates a device ID. The destination also
clears its runtime identity cache so the next push re-fires the setters.

## Consent

Declare the required consent keys on the destination config, then push a walker
consent event — the destination's `on('consent')` handler toggles
`amplitude.setOptOut()` accordingly. Semantics are strict: all required keys
must be granted for opt-in; any missing grant opts out.

```typescript
config: {
  consent: { analytics: true }, // required consent keys
  settings: { apiKey: 'YOUR_KEY' },
}
// elb('walker consent', { analytics: false }) → amplitude.setOptOut(true)
// elb('walker consent', { analytics: true  }) → amplitude.setOptOut(false)
```

## Plugins

All three plugins are bundled via `@amplitude/unified` and opt-in via
destination settings:

```typescript
settings: {
  apiKey: 'YOUR_KEY',

  // Session Replay
  sessionReplay: { sampleRate: 1 },

  // Feature Experiments (via @amplitude/unified)
  experiment: { deploymentKey: 'DEPLOYMENT_KEY' },

  // Guides & Surveys (true for defaults, object for custom)
  engagement: true,
}
```

## Related

- [walkerOS documentation](https://www.walkeros.io/docs)
- [Amplitude Browser SDK docs](https://amplitude.com/docs/sdks/analytics/browser/browser-sdk-2)
- [Amplitude Session Replay](https://amplitude.com/docs/session-replay)
- [Amplitude Experiment](https://amplitude.com/docs/experiment)
- [Amplitude Guides & Surveys](https://amplitude.com/docs/guides-and-surveys)

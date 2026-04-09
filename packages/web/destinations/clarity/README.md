<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Microsoft Clarity Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/clarity)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-clarity)
&bull; [Documentation](https://www.walkeros.io/docs/destinations/web/clarity)

This package forwards walkerOS events to
[Microsoft Clarity](https://clarity.microsoft.com/) — session replays, heatmaps,
and behavioural insights for web products. Built on the official
[`@microsoft/clarity`](https://www.npmjs.com/package/@microsoft/clarity) SDK.

walkerOS follows a **source → collector → destination** architecture. This
Clarity destination receives processed events from the walkerOS collector and
forwards them as Clarity events, tags, identities, and consent updates.

## Features

- **Default event forwarding** — every walkerOS event becomes
  `Clarity.event(name)` with no additional config
- **Custom tags** — flatten walkerOS event sections (`settings.include`) or
  define explicit tag maps (`mapping.settings.set`)
- **Identity** — resolve mapping values into positional arguments for
  `Clarity.identify(...)`
- **Session priority** — flag important sessions via `Clarity.upgrade(reason)`
  so Clarity retains them beyond sampling
- **Consent translation** — explicit `settings.consent` table translates
  walkerOS consent keys to Clarity's `ConsentV2` categories

## Installation

```sh
npm install @walkeros/web-destination-clarity
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationClarity } from '@walkeros/web-destination-clarity';

await startFlow({
  destinations: {
    clarity: {
      code: destinationClarity,
      config: {
        settings: {
          apiKey: '3t0wlogvdz', // your Clarity project ID
          consent: {
            analytics: 'analytics_Storage',
            marketing: 'ad_Storage',
          },
        },
      },
    },
  },
});
```

## Configuration

### Settings (destination-level)

| Name       | Type                                                  | Description                                                                                    | Required |
| ---------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| `apiKey`   | `string`                                              | Microsoft Clarity project ID (from Clarity → Settings → Setup)                                 | Yes      |
| `consent`  | `Record<string, 'analytics_Storage' \| 'ad_Storage'>` | Translation table from walkerOS consent keys to Clarity `ConsentV2` categories                 | No       |
| `include`  | `string[]`                                            | walkerOS event sections to flatten into Clarity tags (`data`, `globals`, `context`, `user`, …) | No       |
| `identify` | `Mapping.Value`                                       | Destination-level identity mapping; resolves to positional args for `Clarity.identify(...)`    | No       |

### Mapping (`rule.settings`)

| Name       | Type            | Description                                                                                             |
| ---------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `identify` | `Mapping.Value` | Per-event identity override; resolves to `{ customId, customSessionId?, customPageId?, friendlyName? }` |
| `include`  | `string[]`      | Override destination-level `include` for this rule                                                      |
| `set`      | `Mapping.Value` | Explicit custom tag map; resolved object keys become `Clarity.setTag(key, value)` calls                 |
| `upgrade`  | `Mapping.Value` | Session priority reason; resolves to a string → `Clarity.upgrade(reason)`                               |

## Custom Tags

Two ways to attach custom tags to a Clarity session:

```typescript
// 1. Flatten walkerOS sections with settings.include
config: {
  settings: {
    apiKey: '3t0wlogvdz',
    include: ['data', 'user'], // → data_*, user_* tags on every event
  },
}

// 2. Explicit per-event tags via mapping.settings.set
mapping: {
  product: {
    view: {
      settings: {
        set: {
          map: {
            product_color: 'data.color',
            product_id: 'data.id',
          },
        },
      },
    },
  },
}
```

## Consent Translation

Clarity expects its own category names (`analytics_Storage`, `ad_Storage`).
walkerOS uses arbitrary consent keys, so translation is explicit — no magic
defaults. Configure `settings.consent` once and the destination handles
`walker consent` events automatically:

```typescript
settings: {
  apiKey: '3t0wlogvdz',
  consent: {
    analytics: 'analytics_Storage',
    marketing: 'ad_Storage',
  },
}
```

All consent state — grants, revocations, partial updates — is forwarded to
`Clarity.consentV2(...)`. The legacy `Clarity.consent(...)` API is not used.
Without `settings.consent`, the destination takes no action on consent changes;
the walkerOS `config.consent` gate still blocks unconsented events from reaching
the destination in the first place.

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.

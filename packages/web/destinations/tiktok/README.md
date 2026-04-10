<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# TikTok Pixel Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/tiktok)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-tiktok)
&bull; [Documentation](https://www.walkeros.io/docs/destinations/web/tiktok)

This package forwards walkerOS events to the
[TikTok Pixel](https://business-api.tiktok.com/portal/docs?id=1739585702922241)
— conversion tracking and audience building for TikTok Ads. The destination
wraps the standard TikTok Pixel snippet (loaded from
`https://analytics.tiktok.com/i18n/pixel/events.js`); there is no npm SDK for
the browser pixel.

walkerOS follows a **source → collector → destination** architecture. This
TikTok destination receives processed events from the walkerOS collector and
forwards them as `ttq.track`, `ttq.identify`, and consent toggles via
`ttq.enableCookie` / `ttq.disableCookie`.

## Features

- **Default event forwarding** — every walkerOS event becomes
  `ttq.track(name, params, { event_id })`. The `event_id` is the walkerOS event
  id, ready for deduplication with a server-side Events API destination.
- **Standard event renaming** — `mapping.name` flips walkerOS event names
  (`"product view"`) into TikTok's rigid 14-event taxonomy (`"ViewContent"`). An
  exported `StandardEventNames` TypeScript union lights up IDE autocomplete;
  arbitrary strings are still allowed for custom events.
- **Advanced Matching** — destination-level + per-event `settings.identify`
  resolving to `{ email, phone_number, external_id }`. Runtime state diffing
  skips redundant `ttq.identify()` calls on unchanged values. The TikTok SDK
  auto-hashes all values with SHA256 before sending.
- **Custom event properties** — `settings.include` flattens walkerOS event
  sections (`data`, `globals`, `user`, …) with prefixes (`data_id`, `user_id`,
  …) onto the params object. Useful for custom events where TikTok won't
  optimize anyway.
- **Consent cookie toggling** — the `on('consent')` handler reads
  `config.consent` and calls `ttq.enableCookie()` when all required consent keys
  are granted, `ttq.disableCookie()` otherwise.
- **No npm dependency** — TikTok ships only the script-tag snippet. The
  destination injects the CDN tag via `addScript()` exactly like the Meta Pixel
  destination.

## Installation

```sh
npm install @walkeros/web-destination-tiktok
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationTikTok } from '@walkeros/web-destination-tiktok';

await startFlow({
  consent: { marketing: false },
  destinations: {
    tiktok: {
      code: destinationTikTok,
      config: {
        consent: { marketing: true },
        settings: {
          apiKey: 'C4XXXXXXXXXXXXXXXXXXX', // your TikTok Pixel ID
        },
      },
    },
  },
});
```

## Configuration

### Settings (destination-level)

| Name               | Type            | Description                                                                                           | Required |
| ------------------ | --------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| `apiKey`           | `string`        | TikTok Pixel ID — first argument to `ttq.load(...)`                                                   | Yes      |
| `identify`         | `Mapping.Value` | Resolves to an Advanced Matching object (`email`, `phone_number`, `external_id`). SHA256 auto-hashed. | No       |
| `include`          | `string[]`      | walkerOS event sections to flatten with prefix (`data` → `data_*`, `globals` → `globals_*`, …)        | No       |
| `auto_config`      | `boolean`       | TikTok default `true`. Enable automatic form field detection for Advanced Matching                    | No       |
| `limited_data_use` | `boolean`       | TikTok default `false`. Restrict data use under U.S. state privacy laws                               | No       |

Any additional snake_case TikTok Pixel init option (passthrough) is forwarded to
`ttq.load(apiKey, options)` unchanged.

### Mapping (`rule.settings`)

| Name       | Type            | Description                                                              |
| ---------- | --------------- | ------------------------------------------------------------------------ |
| `identify` | `Mapping.Value` | Per-event Advanced Matching override. Same shape as `settings.identify`. |
| `include`  | `string[]`      | Replaces destination-level `include` for this rule.                      |

`mapping.name` (the walkerOS-standard event-rename mechanism) flips the walkerOS
event name into TikTok's standard event taxonomy.

## Standard Events

TikTok recognizes 14 standard events for ad optimization. Use `mapping.name` to
flip walkerOS event names into the rigid taxonomy:

| TikTok name            | When to use                                    |
| ---------------------- | ---------------------------------------------- |
| `ViewContent`          | Product / content detail view                  |
| `ClickButton`          | Generic CTA click                              |
| `Search`               | Site search                                    |
| `AddToWishlist`        | Item added to a wishlist                       |
| `AddToCart`            | Item added to cart                             |
| `InitiateCheckout`     | User started checkout                          |
| `AddPaymentInfo`       | Payment details entered                        |
| `CompletePayment`      | Order successfully placed (primary conversion) |
| `PlaceAnOrder`         | Order placed (alternative)                     |
| `Contact`              | Lead / contact form                            |
| `Download`             | Asset download                                 |
| `SubmitForm`           | Generic form submission                        |
| `CompleteRegistration` | User signup                                    |
| `Subscribe`            | Subscription start                             |

Custom event names (any string not in the list) are still tracked but receive no
optimization signal.

## Custom Event Properties

Two ways to attach custom params to a `ttq.track()` call:

```typescript
// 1. Flatten walkerOS sections with settings.include
config: {
  settings: {
    apiKey: 'C4XXXXXXXXXXXXXXXXXXX',
    include: ['data', 'user'], // → data_*, user_* params on every event
  },
}

// 2. Explicit per-event params via mapping.data (the canonical pattern)
mapping: {
  product: {
    view: {
      name: 'ViewContent',
      data: {
        map: {
          content_type: { value: 'product' },
          content_id: 'data.id',
          content_name: 'data.name',
          value: 'data.price',
          currency: { key: 'data.currency', value: 'EUR' },
        },
      },
    },
  },
}
```

When a rule sets `mapping.data`, the resolved object is the params object —
`settings.include` is bypassed for that call. Set
`mapping.settings.include = []` to ensure no prefixed properties leak in.

## Advanced Matching

TikTok matches conversions back to TikTok users via three optional parameters:
`email`, `phone_number`, `external_id`. The SDK hashes them with SHA256 before
sending, so it's safe to pass raw values.

```typescript
// Destination-level — fires on first push, then re-fires only when the
// resolved value changes (runtime state diffing)
config: {
  settings: {
    apiKey: 'C4XXXXXXXXXXXXXXXXXXX',
    identify: {
      map: {
        email: 'user.email',
        phone_number: 'user.phone',
        external_id: 'user.id',
      },
    },
  },
}

// Per-event — overrides destination-level for one push (e.g. signup form)
mapping: {
  user: {
    register: {
      name: 'CompleteRegistration',
      settings: {
        identify: {
          map: {
            email: 'data.email',
            phone_number: 'data.phone',
            external_id: 'data.user_id',
          },
        },
      },
    },
  },
}
```

`ttq.identify()` always fires **before** `ttq.track()` so Advanced Matching is
set for the conversion event.

## Ecommerce — `CompletePayment`

The hero example. `mapping.data` builds the TikTok-native shape; `loop` walks
`event.nested` to produce the `contents` array; `{ key, value: 'EUR' }` provides
a fallback currency.

```typescript
mapping: {
  order: {
    complete: {
      name: 'CompletePayment',
      data: {
        map: {
          content_type: { value: 'product' },
          value: 'data.total',
          currency: { key: 'data.currency', value: 'EUR' },
          order_id: 'data.id',
          contents: {
            loop: [
              'nested',
              {
                map: {
                  content_id: 'data.id',
                  content_name: 'data.name',
                  quantity: { key: 'data.quantity', value: 1 },
                  price: 'data.price',
                },
              },
            ],
          },
        },
      },
      settings: { include: [] },
    },
  },
}
```

## Consent

TikTok is an advertising platform — the typical walkerOS consent key is
`marketing` (whatever name your CMP reports). The walkerOS `config.consent` gate
blocks unconsented events from reaching the destination in the first place; the
destination's `on('consent')` handler then toggles TikTok's own cookie state for
attribution.

```typescript
config: {
  consent: { marketing: true },
  settings: { apiKey: 'C4XXXXXXXXXXXXXXXXXXX' },
}
```

The handler iterates every key in `config.consent` and calls
`ttq.enableCookie()` only when **all** required keys are granted. Otherwise it
calls `ttq.disableCookie()`. This is the conservative semantic that matches
walkerOS's gating model.

> TikTok's SDK auto-fires `ttq.page()` once on load. The destination has no knob
> to suppress it — letting the auto page view fire is the expected behavior. If
> you need fine-grained page-view control, gate the destination behind a
> transformer.

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.

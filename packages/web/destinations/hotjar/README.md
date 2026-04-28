<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Hotjar Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/hotjar)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-hotjar)
&bull; [Documentation](https://www.walkeros.io/docs/destinations/web/hotjar)

This package forwards walkerOS events to [Hotjar](https://www.hotjar.com/) -
session recordings, heatmaps, surveys, and on-page feedback. Built on the
official [`@hotjar/browser`](https://www.npmjs.com/package/@hotjar/browser) SDK.

walkerOS follows a **source → collector → destination** architecture. This
Hotjar destination receives processed events from the walkerOS collector and
forwards them as Hotjar events, identities, and SPA route notifications.

## Features

- **Default event forwarding** - every walkerOS event becomes
  `Hotjar.event(name)` with no additional config
- **Identity** - `Hotjar.identify(userId, attributes)` with userId extracted
  from the resolved mapping value; remaining keys become user attributes
- **SPA state change** - `Hotjar.stateChange(path)` for accurate heatmaps on
  virtual page views in single-page applications
- **Snippet injection** - `@hotjar/browser` handles script loading, including
  CSP `nonce` and debug mode

## Installation

```sh
npm install @walkeros/web-destination-hotjar
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationHotjar } from '@walkeros/web-destination-hotjar';

await startFlow({
  destinations: {
    hotjar: {
      code: destinationHotjar,
      config: {
        settings: {
          siteId: 1234567, // your Hotjar site ID
        },
      },
    },
  },
});
```

## Configuration

### Settings (destination-level)

| Name            | Type            | Description                                                                                            | Required |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| `siteId`        | `number`        | Hotjar site ID (numeric, from dashboard Settings)                                                      | Yes      |
| `hotjarVersion` | `number`        | Hotjar snippet version. Defaults to `6`. Override only if Hotjar releases a new version.               | No       |
| `debug`         | `boolean`       | Enable Hotjar debug mode for development troubleshooting                                               | No       |
| `nonce`         | `string`        | CSP nonce for the injected Hotjar script tag (required with strict Content-Security-Policy)            | No       |
| `identify`      | `Mapping.Value` | Destination-level identity mapping; resolves to `{ userId, ...attributes }` for `Hotjar.identify(...)` | No       |

### Mapping (`rule.settings`)

| Name          | Type            | Description                                                                                                  |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `identify`    | `Mapping.Value` | Per-event identity override; resolves to `{ userId, ...attributes }` → `Hotjar.identify(userId, attributes)` |
| `stateChange` | `Mapping.Value` | SPA route change; resolves to a relative path string → `Hotjar.stateChange(path)`                            |

Standard mapping features also apply:

- `name` - rename the forwarded event (`Hotjar.event(<new name>)`)
- `silent` - suppress the default `Hotjar.event(...)` call while still running
  `identify` / `stateChange`
- `ignore` - drop the event entirely (no calls produced)

## Event Forwarding

Hotjar's `event(actionName)` API is name-only - no properties, no payload. The
destination forwards the walkerOS `event.name` (e.g. `"order complete"`) by
default. Rename with `mapping.name`:

```typescript
mapping: {
  order: {
    complete: {
      name: 'completed_purchase',
    },
  },
}
```

## Identity

Hotjar recommends calling `identify()` on every page load so subsequent events
are associated with the right user. Configure at the destination level:

```typescript
settings: {
  siteId: 1234567,
  identify: {
    map: {
      userId: 'user.id',
      plan: 'user.plan',
    },
  },
}
```

The resolved object's `userId` becomes the first positional argument; every
other key becomes a user attribute (Hotjar accepts `string | number | boolean`).
Non-primitive values are skipped.

Per-event identity overrides destination-level identity via
`mapping.settings.identify`.

## SPA State Change

For single-page applications, fire `Hotjar.stateChange(path)` on route changes
so heatmaps aggregate by virtual URL. Typical pattern: hook into your router and
emit a walkerOS event:

```typescript
mapping: {
  page: {
    view: {
      silent: true, // Suppress default Hotjar.event('page view')
      settings: {
        stateChange: 'data.id', // Resolves to the new path
      },
    },
  },
}
```

## Consent

Hotjar has no runtime consent API. Consent is gated at the walkerOS level via
`config.consent`:

```typescript
destinations: {
  hotjar: {
    code: destinationHotjar,
    config: {
      consent: { marketing: true },
      settings: { siteId: 1234567 },
    },
  },
}
```

Unconsented events are blocked by the collector before reaching the destination.

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.

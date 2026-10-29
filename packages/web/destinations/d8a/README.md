# @walkeros/web-destination-d8a

d8a web destination for walkerOS. It sends walkerOS events to the d8a web
tracker using the GA4 gtag-style `d8a()` API.

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/d8a)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-d8a)

## Installation

```bash
npm install @walkeros/web-destination-d8a
```

## Usage

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationD8a } from '@walkeros/web-destination-d8a';

await startFlow({
  destinations: {
    d8a: {
      code: destinationD8a,
      config: {
        settings: {
          property_id: '80e1d6d0-560d-419f-ac2a-fe9281e93386',
          server_container_url:
            'https://global.t.d8a.tech/80e1d6d0-560d-419f-ac2a-fe9281e93386/d/c',
        },
      },
    },
  },
});
```

This quick start sets no consent, so d8a receives every event without consent,
and a denial only updates d8a's consent mode: add `consent: { analytics: true }`
to `config` before you go live, see the docs.

## Configuration

| Name                   | Type                | Required | Description                                 |
| ---------------------- | ------------------- | -------- | ------------------------------------------- |
| `property_id`          | `string`            | Yes      | d8a property ID                             |
| `server_container_url` | `string`            | Yes      | d8a collector URL for the property          |
| `send_page_view`       | `boolean`           | No       | Set `false` to disable automatic page views |
| `debug_mode`           | `boolean`           | No       | Enable d8a debug mode                       |
| `dataLayerName`        | `string`            | No       | Queue name, defaults to `d8aLayer`          |
| `globalName`           | `string`            | No       | Global function name, defaults to `d8a`     |
| `snakeCase`            | `boolean`           | No       | Convert walkerOS event names to snake_case  |
| `como`                 | `boolean \| object` | No       | Consent mode mapping, defaults to `true`    |

The destination follows d8a behavior for page views: automatic page views are
preserved by default and disabled only when `send_page_view: false` is
configured.

## Event Mapping

By default, walkerOS event names are converted to snake_case and sent with the
configured property ID as `send_to`.

```typescript
mapping: {
  order: {
    complete: {
      name: 'purchase',
      data: {
        map: {
          transaction_id: 'data.id',
          value: 'data.value',
          currency: { key: 'data.currency', value: 'EUR' },
        },
      },
    },
  },
}
```

This produces:

```typescript
d8a('event', 'purchase', {
  transaction_id: '0rd3r1d',
  value: 462,
  currency: 'EUR',
  send_to: '80e1d6d0-560d-419f-ac2a-fe9281e93386',
});
```

## Consent Mode

The destination supports d8a's gtag-compatible consent mode. By default, the
mapping is:

| walkerOS consent key | d8a consent fields                                 |
| -------------------- | -------------------------------------------------- |
| `marketing`          | `ad_storage`, `ad_user_data`, `ad_personalization` |
| `analytics`          | `analytics_storage`                                |

When several consent keys map to the same field, the field is `granted` only if
every one of them is granted. Disable consent mode with:

```typescript
settings: {
  como: false,
}
```

Or provide a custom mapping, which replaces the default:

```typescript
settings: {
  como: {
    statistics: 'analytics_storage',
    marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
  },
}
```

## Related

- [d8a web tracker docs](https://docs.d8a.tech/articles/sources/web-tracker/)
- [Destination interface](../../../core/src/types/destination.ts)

## License

MIT

<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Segment CDP Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/segment)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-segment)
&bull; [Documentation](https://www.walkeros.io/docs/destinations/web/segment)

This package forwards walkerOS events to [Segment](https://segment.com/) - the
customer data platform that routes your event data to 400+ downstream
destinations. Built on the official
[`@segment/analytics-next`](https://www.npmjs.com/package/@segment/analytics-next)
(Analytics.js 2.0) SDK.

walkerOS follows a **source → collector → destination** architecture. This
Segment destination receives processed events from the walkerOS collector and
forwards them via the full Segment Spec surface: `track`, `identify`, `group`,
`page`, and `reset`.

## Features

- **Default event forwarding** - every walkerOS event becomes
  `analytics.track(name, properties)` with no additional config
- **Custom event properties** - flatten walkerOS sections with
  `settings.include` (`data_*`, `globals_*`, etc.) or produce fully-shaped
  Segment Spec properties via `mapping.data`
- **Identity** - destination-level or per-event `settings.identify` resolving to
  `{ userId, traits, anonymousId }`, with runtime state diffing so redundant
  `identify()` calls are skipped
- **Groups** - `settings.group` with Segment-reserved group traits (`name`,
  `industry`, `employees`, `plan`, ...)
- **Page views** - first-class `analytics.page(category, name, properties)` via
  explicit `mapping.settings.page` configuration
- **Reset on logout** - `settings.reset: true` calls `analytics.reset()` so the
  current user identity is cleared
- **Consent context forwarding** - walkerOS consent state is automatically
  stamped as `context.consent.categoryPreferences` on every call, with optional
  `settings.consent` key remapping
- **Deferred-load consent pattern** - when `config.consent` is declared,
  `AnalyticsBrowser.load()` is held until the first grant
- **Ecommerce via the Segment Spec** - walkerOS `mapping.name` + `mapping.data`
  produce PascalCase event names (`Order Completed`) with a `products` array, a
  single `track()` call per order (no loop)

## Installation

```sh
npm install @walkeros/web-destination-segment
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationSegment } from '@walkeros/web-destination-segment';

await startFlow({
  destinations: {
    segment: {
      code: destinationSegment,
      config: {
        settings: {
          apiKey: 'YOUR_SEGMENT_WRITE_KEY',
        },
      },
    },
  },
});
```

## Configuration

### Settings (destination-level)

The `Settings` type extends Segment's `InitOptions`, so every passthrough option
(cookie, storage, integrations, plan, retryQueue, ...) works alongside the
walkerOS-specific fields listed below.

| Name                       | Type                     | Description                                                                                                         | Required |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------- |
| `apiKey`                   | `string`                 | Your Segment source write key - maps to `writeKey` in `AnalyticsBrowser.load()`                                     | Yes      |
| `identify`                 | `Mapping.Value`          | Destination-level identity mapping resolving to `{ userId, traits, anonymousId }`                                   | No       |
| `group`                    | `Mapping.Value`          | Destination-level group mapping resolving to `{ groupId, traits }`                                                  | No       |
| `include`                  | `string[]`               | walkerOS event sections to flatten into Segment `properties` (`data`, `globals`, `context`, `user`, `event`, `all`) | No       |
| `consent`                  | `Record<string, string>` | Mapping from walkerOS consent keys → Segment `categoryPreferences` keys (e.g. `{ marketing: 'Advertising' }`)       | No       |
| `initialPageview`          | `boolean`                | Default `false` - walkerOS sources handle page tracking, so the SDK's auto pageview is disabled                     | No       |
| `disableClientPersistence` | `boolean`                | Disable all cookie / localStorage writes                                                                            | No       |
| `integrations`             | `object`                 | Enable/disable downstream Segment destinations. Example: `{ All: true, Mixpanel: false }`                           | No       |

### Mapping (`rule.settings`)

| Name       | Type                    | Description                                                                                                 |
| ---------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `identify` | `Mapping.Value`         | Per-event identity override; resolves to `{ userId, traits, anonymousId }`                                  |
| `group`    | `Mapping.Value`         | Per-event group assignment; resolves to `{ groupId, traits }`                                               |
| `page`     | `Mapping.Value \| true` | Page call config. `true` → empty `analytics.page()`. Object resolves to `{ category?, name?, properties? }` |
| `reset`    | `Mapping.Value \| true` | Logout trigger. Truthy → `analytics.reset()`                                                                |
| `include`  | `string[]`              | Override destination-level `include` for this rule                                                          |

Use `mapping.silent: true` to suppress the default `analytics.track()` call when
a rule runs identity / group / page side effects only.

## Event Properties

Two ways to shape Segment track properties:

```typescript
// 1. Flatten walkerOS sections via settings.include
config: {
  settings: {
    apiKey: 'WRITE_KEY',
    include: ['data', 'globals'], // → data_*, globals_* props on every event
  },
}

// 2. Build Segment-Spec-shaped properties via mapping.data
mapping: {
  order: {
    complete: {
      name: 'Order Completed',
      data: {
        map: {
          order_id: 'data.id',
          currency: { key: 'data.currency', value: 'EUR' },
          shipping: 'data.shipping',
          tax: 'data.taxes',
          total: 'data.total',
          products: {
            loop: [
              'nested',
              {
                condition: (v) => typeof v?.data?.price === 'number',
                map: {
                  product_id: 'data.id',
                  name: 'data.name',
                  price: 'data.price',
                  quantity: { key: 'data.quantity', value: 1 },
                  currency: { key: 'data.currency', value: 'EUR' },
                },
              },
            ],
          },
        },
      },
    },
  },
}
```

The Segment Ecommerce Spec uses a **single**
`track('Order Completed', { products: [...] })` call - not a loop of N revenue
calls. walkerOS `mapping.data` with a nested `loop` over `nested` builds the
products array inline.

## Identity

Destination-level identity fires on every push (with state diffing to skip
redundant calls):

```typescript
config: {
  settings: {
    apiKey: 'WRITE_KEY',
    identify: {
      map: {
        userId: 'user.id',
        traits: {
          map: {
            email: 'user.email',
            name: 'user.name',
          },
        },
      },
    },
  },
}
```

Per-event identity uses a mapping rule with `silent: true` so only the identity
side effect runs (not a default `track()`):

```typescript
mapping: {
  user: {
    login: {
      silent: true,
      settings: {
        identify: {
          map: {
            userId: 'data.user_id',
            traits: {
              map: {
                email: 'data.email',
                plan: 'data.plan',
              },
            },
          },
        },
      },
    },
  },
}
```

### Reserved Traits (Segment Spec)

Use these trait names so downstream destinations recognize them: `email`,
`name`, `firstName`, `lastName`, `phone`, `avatar`, `birthday`, `plan`,
`company`, `createdAt`, `title`, `username`, `gender`, `age`.

## Groups

```typescript
mapping: {
  company: {
    update: {
      silent: true,
      settings: {
        group: {
          map: {
            groupId: 'data.company_id',
            traits: {
              map: {
                name: 'data.company_name',
                industry: 'data.industry',
                employees: 'data.employees',
                plan: 'data.plan',
              },
            },
          },
        },
      },
    },
  },
}
```

Reserved Segment group traits: `name`, `industry`, `employees`, `plan`,
`createdAt`, `description`, `email`, `website`.

## Page Views

Segment's `page()` is first-class - walkerOS `page view` events should map to
`analytics.page()`, not `analytics.track('page view')`. Configure explicitly via
`mapping.settings.page`:

```typescript
mapping: {
  page: {
    view: {
      silent: true,
      settings: {
        page: {
          map: {
            category: 'data.category',
            name: 'data.title',
            properties: {
              map: {
                section: 'data.section',
              },
            },
          },
        },
      },
    },
  },
}
```

Or the minimal form (`true`) that fires an empty `analytics.page()` and relies
on the SDK's automatic url/path/referrer/title collection:

```typescript
mapping: {
  page: {
    view: {
      silent: true,
      settings: {
        page: true,
      },
    },
  },
}
```

## Consent

The destination supports two complementary consent mechanisms:

**Automatic context forwarding.** When `settings.consent` is configured, the
destination stamps every `track`, `identify`, `group`, and `page` call with
`context.consent.categoryPreferences`:

```typescript
config: {
  settings: {
    apiKey: 'WRITE_KEY',
    consent: {
      analytics: 'Analytics',
      marketing: 'Advertising',
    },
  },
}
```

When the walker emits an event with
`consent: { analytics: true, marketing: true }`, the destination calls
`analytics.track(name, props, { context: { consent: { categoryPreferences: { Analytics: true, Advertising: true } } } })`.

**Deferred-load consent pattern.** When `config.consent` is declared,
`AnalyticsBrowser.load()` is held until the first `walker consent` command that
grants all required keys. Once granted, the SDK loads and all queued events
flush:

```typescript
destinations: {
  segment: {
    code: destinationSegment,
    config: {
      consent: { analytics: true },
      settings: { apiKey: 'WRITE_KEY' },
    },
  },
}
```

This is the primary consent mechanism for Segment, since Segment's SDK has no
`optOut()` method - the only way to enforce consent is to avoid loading the SDK
in the first place.

## Reset (Logout)

```typescript
mapping: {
  user: {
    logout: {
      silent: true,
      settings: {
        reset: true,
      },
    },
  },
}
```

`analytics.reset()` clears the stored `userId`, `anonymousId`, and traits, then
generates a fresh anonymous ID.

## Scope Notes

- **`alias()` and `screen()`** are intentionally deferred. `alias()` is a legacy
  identity-linking method (most identity resolution happens server-side in
  Segment Profiles); `screen()` is mobile-only.
- **Plugins, source middleware, and destination middleware** cannot be
  serialized in JSON flow configs. Register them programmatically on the
  returned `AnalyticsBrowser` instance if needed.

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.

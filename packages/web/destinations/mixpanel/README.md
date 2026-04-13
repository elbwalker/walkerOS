<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Mixpanel Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/mixpanel)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-mixpanel)
&bull; [Documentation](https://www.walkeros.io/docs/destinations/web/mixpanel)

This package forwards walkerOS events to [Mixpanel](https://mixpanel.com/) —
product analytics for tracking user behaviour, funnels, retention, and
group-level metrics. Built on the official
[`mixpanel-browser`](https://www.npmjs.com/package/mixpanel-browser) SDK.

walkerOS follows a **source → collector → destination** architecture. This
Mixpanel destination receives processed events from the walkerOS collector and
forwards them as `track()` calls, identity updates, people-profile operations,
group assignments, and consent changes.

## Features

- **Default event forwarding** — every walkerOS event becomes
  `mixpanel.track(name, properties)` with no extra config
- **Identity** — destination- or per-event `settings.identify` resolves to
  `{ distinctId }` → `mixpanel.identify(distinctId)`, with runtime state diffing
  so identical distinct IDs don't re-fire
- **Full people vocabulary** — all eight Mixpanel operations supported: `set`,
  `set_once`, `increment`, `append`, `union`, `remove`, `unset`, `delete_user`
- **Groups** — user→group association via `mixpanel.set_group(key, id)` and
  group-profile properties via `mixpanel.get_group(key, id).set/set_once/…`
- **Reset on logout** — `settings.reset: true` calls `mixpanel.reset()` so the
  next session starts with a fresh anonymous distinct ID
- **Consent** — `on('consent')` handler derives required keys from
  `config.consent` and toggles `opt_in_tracking` / `opt_out_tracking`
- **Full SDK passthrough** — every `mixpanel-browser` `Config` option
  (`api_host`, `persistence`, `batch_requests`, `record_sessions_percent`,
  `cross_subdomain_cookie`, etc.) flows through directly

## Installation

```sh
npm install @walkeros/web-destination-mixpanel
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationMixpanel } from '@walkeros/web-destination-mixpanel';

await startFlow({
  destinations: {
    mixpanel: {
      code: destinationMixpanel,
      config: {
        consent: { analytics: true },
        settings: {
          apiKey: 'YOUR_PROJECT_TOKEN',
          api_host: 'https://api-eu.mixpanel.com', // optional, for EU residency
        },
      },
    },
  },
});
```

## Configuration

### Settings (destination-level)

| Name                      | Type                         | Description                                                                                      | Required |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| `apiKey`                  | `string`                     | Mixpanel project token (Project Settings → Access Keys)                                          | Yes      |
| `api_host`                | `string`                     | Ingestion host. Default `https://api-js.mixpanel.com`. Use `https://api-eu.mixpanel.com` for EU. | No       |
| `persistence`             | `'cookie' \| 'localStorage'` | Client-side persistence backend. Default `cookie`.                                               | No       |
| `batch_requests`          | `boolean`                    | Use the `/batch` endpoint. Default `true`.                                                       | No       |
| `record_sessions_percent` | `number`                     | Session replay sampling (0–100). Default `0`.                                                    | No       |
| `track_pageview`          | `boolean \| string`          | Mixpanel auto-pageview. walkerOS default `false` (walkerOS sources handle page views).           | No       |
| `autocapture`             | `boolean \| object`          | Mixpanel autocapture. walkerOS default `false`.                                                  | No       |
| `include`                 | `string[]`                   | Event sections flattened into `track()` properties (`data`, `globals`, `context`, `user`, …)     | No       |
| `identify`                | `Mapping.Value`              | Destination-level identity mapping; resolves to `{ distinctId }`                                 | No       |
| `group`                   | `Mapping.Value`              | Destination-level group assignment; resolves to `{ key, id }`                                    | No       |

All other `mixpanel-browser` `Config` options (snake_case) pass through directly
— the destination's `Settings` type extends `Partial<Config>`.

### Mapping (`rule.settings`)

| Name           | Type                       | Description                                                                                                      |
| -------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `identify`     | `Mapping.Value`            | Per-event identity override; resolves to `{ distinctId }`                                                        |
| `include`      | `string[]`                 | Override destination-level `include` for this rule                                                               |
| `people`       | `Mapping.Value`            | Per-event people operations (see People section below)                                                           |
| `group`        | `Mapping.Value`            | Per-event group assignment; resolves to `{ key, id }`                                                            |
| `groupProfile` | `Mapping.Value`            | Per-event group-profile operations; resolves to `{ key, id, set?, set_once?, union?, remove?, unset?, delete? }` |
| `reset`        | `boolean \| Mapping.Value` | Logout trigger; resolves truthy → `mixpanel.reset()`                                                             |

## Custom Event Properties

Use `settings.include` (destination-level) or `rule.settings.include` (per-rule)
to flatten walkerOS event sections into `track()` properties. Each section is
prefixed (`data_*`, `globals_*`, `user_*`, …):

```typescript
// Destination-level: every event carries data_* properties
settings: { include: ['data'] }

// Per-rule override: this rule sends only globals_* properties
mapping: {
  order: {
    complete: {
      settings: { include: ['globals'] },
    },
  },
}
```

For revenue events the Mixpanel `people.track_charge` API is deprecated
(v2.78+); pass revenue fields as regular event properties instead — currency
values in sample events use `"EUR"`.

## Identity

```typescript
// Destination-level — every push with a user.id fires identify
settings: {
  apiKey: 'YOUR_TOKEN',
  identify: { map: { distinctId: 'user.id' } },
}

// Per-event override
mapping: {
  user: {
    login: {
      settings: {
        identify: { map: { distinctId: 'data.user_id' } },
      },
    },
  },
}
```

Runtime state diffing means identical `distinctId` values don't re-fire
`mixpanel.identify()` — the SDK call only runs when the resolved value changes.

## People

All eight Mixpanel people operations are supported via `settings.people`. Each
key in the resolved object fires a separate `mixpanel.people.*` call:

| Key           | Signature                   | Fires                            |
| ------------- | --------------------------- | -------------------------------- |
| `set`         | `Record<string, unknown>`   | `mixpanel.people.set(obj)`       |
| `set_once`    | `Record<string, unknown>`   | `mixpanel.people.set_once(obj)`  |
| `increment`   | `Record<string, number>`    | `mixpanel.people.increment(obj)` |
| `append`      | `Record<string, unknown>`   | `mixpanel.people.append(obj)`    |
| `union`       | `Record<string, unknown[]>` | `mixpanel.people.union(obj)`     |
| `remove`      | `Record<string, unknown>`   | `mixpanel.people.remove(obj)`    |
| `unset`       | `string[]`                  | `mixpanel.people.unset(list)`    |
| `delete_user` | `true`                      | `mixpanel.people.delete_user()`  |

```typescript
mapping: {
  user: {
    login: {
      skip: true,
      settings: {
        identify: { map: { distinctId: 'data.user_id' } },
        people: {
          map: {
            set: { map: { plan: 'data.plan', email: 'data.email' } },
            set_once: { map: { first_login: 'timestamp' } },
            increment: { map: { login_count: { value: 1 } } },
          },
        },
      },
    },
  },
}
```

## Groups

User→group association uses `mixpanel.set_group(key, id)`:

```typescript
mapping: {
  user: {
    login: {
      settings: {
        group: { map: { key: { value: 'company_id' }, id: 'data.company_id' } },
      },
    },
  },
}
```

Group profile properties use `mixpanel.get_group(key, id).set/…`:

```typescript
mapping: {
  company: {
    update: {
      skip: true,
      settings: {
        groupProfile: {
          map: {
            key: { value: 'company_id' },
            id: 'data.company_id',
            set: {
              map: { name: 'data.company_name', plan: 'data.plan' },
            },
            set_once: { map: { founded: 'data.founded_year' } },
          },
        },
      },
    },
  },
}
```

## Reset / Logout

```typescript
mapping: {
  user: {
    logout: {
      skip: true,
      settings: { reset: true },
    },
  },
}
```

`reset: true` fires `mixpanel.reset()`, clearing all persistence and generating
a new anonymous distinct ID. The destination also clears its runtime identity
state so the next identify call will fire again.

## Consent

Mixpanel consent is wired via the destination's `on('consent')` handler. Declare
`config.consent` on the destination — the handler requires **all** declared keys
to be granted to opt in:

```typescript
destinations: {
  mixpanel: {
    code: destinationMixpanel,
    config: {
      consent: { analytics: true },
      settings: { apiKey: 'YOUR_TOKEN' },
    },
  },
}
```

- All required keys granted → `mixpanel.opt_in_tracking()`
- Any required key missing/denied → `mixpanel.opt_out_tracking()`
- No `config.consent` declared → handler no-ops (relies on walkerOS's own
  consent gate)

## Destroy

The `destroy()` hook calls `mixpanel.stop_batch_senders?.()` to halt the
in-memory batcher. Mixpanel has no public flush API; already-queued events rely
on the SDK's built-in `sendBeacon` unload handler.

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.

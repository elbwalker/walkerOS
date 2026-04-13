<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# PostHog Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/posthog)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-posthog)
&bull; [Documentation](https://www.walkeros.io/docs/destinations/web/posthog)

This package forwards walkerOS events to [PostHog](https://posthog.com/) —
product analytics, session replay, feature flags, surveys, and heatmaps. Built
on the official [`posthog-js`](https://www.npmjs.com/package/posthog-js) SDK.

walkerOS follows a **source → collector → destination** architecture. This
PostHog destination receives processed events from the walkerOS collector and
forwards them as PostHog captures, identifies, group assignments, and consent
updates. All built-in PostHog features (session replay, feature flags, surveys,
heatmaps, exception capture) are available through SDK init passthrough — no
destination-specific plugins required.

## Features

- **Default event forwarding** — every walkerOS event becomes
  `posthog.capture(event.name, properties)` with no additional config
- **Custom event properties** — flatten walkerOS event sections via
  `settings.include` (prefixed as `data_*`, `globals_*`, etc.)
- **Identity** — destination-level and per-event identity mapping resolving to
  `{ distinctId?, $set?, $set_once? }`. With `distinctId`: `posthog.identify()`.
  Without `distinctId`: `posthog.setPersonProperties()` for pure person-property
  updates. Runtime state diffing skips redundant identify calls when the
  resolved values have not changed.
- **Groups** — B2B-style group analytics via `settings.group`; resolves to
  `{ type, key, properties? }` and calls `posthog.group(...)`
- **Logout** — `reset: true` triggers `posthog.reset()` to clear the distinct ID
  and regenerate an anonymous one
- **Consent** — declares required consent keys via `config.consent`; a
  `walker consent` event with all required keys granted calls
  `posthog.opt_in_capturing()`, otherwise `posthog.opt_out_capturing()`
- **Built-in PostHog features as config passthrough** — session replay
  (`session_recording`), feature flags (`bootstrap`, `advanced_disable_flags`),
  surveys (`disable_surveys`), heatmaps (`capture_heatmaps`), exception capture
  (`capture_exceptions`), cookieless mode (`cookieless_mode`). All
  `PostHogConfig` fields pass through unchanged.

## Installation

```sh
npm install @walkeros/web-destination-posthog
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationPostHog } from '@walkeros/web-destination-posthog';

await startFlow({
  destinations: {
    posthog: {
      code: destinationPostHog,
      config: {
        settings: {
          apiKey: 'phc_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          api_host: 'https://eu.i.posthog.com', // or us.i.posthog.com
        },
      },
    },
  },
});
```

## Configuration

### Settings (destination-level)

| Name       | Type            | Description                                                                                        | Required |
| ---------- | --------------- | -------------------------------------------------------------------------------------------------- | -------- |
| `apiKey`   | `string`        | PostHog project API key (starts with `phc_`)                                                       | Yes      |
| `api_host` | `string`        | PostHog ingestion host. Default `https://us.i.posthog.com`. Use `https://eu.i.posthog.com` for EU. | No       |
| `include`  | `string[]`      | walkerOS event sections to flatten into `capture()` properties (`data`, `globals`, `context`, …)   | No       |
| `identify` | `Mapping.Value` | Destination-level identity mapping; resolves to `{ distinctId?, $set?, $set_once? }`               | No       |
| `group`    | `Mapping.Value` | Destination-level group assignment; resolves to `{ type, key, properties? }`                       | No       |

All other [`PostHogConfig`](https://posthog.com/docs/libraries/js#config) fields
(e.g. `session_recording`, `capture_heatmaps`, `bootstrap`, `cookieless_mode`)
pass through unchanged. walkerOS sets three defaults that differ from PostHog's
built-ins: `autocapture: false`, `capture_pageview: false`,
`capture_pageleave: false` — because walkerOS sources handle event capture.
Override them explicitly in `settings` if you want PostHog's autocapture on.

### Mapping (`rule.settings`)

| Name       | Type                       | Description                                                                           |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------- |
| `identify` | `Mapping.Value`            | Per-event identity. Resolves to `{ distinctId?, $set?, $set_once? }`                  |
| `include`  | `string[]`                 | Override destination-level `include` for this rule                                    |
| `group`    | `Mapping.Value`            | Per-event group assignment. Resolves to `{ type, key, properties? }`                  |
| `reset`    | `Mapping.Value \| boolean` | Logout trigger. Truthy value → `posthog.reset()`. Typically paired with `skip: true`. |

## Custom Event Properties

Two ways to attach properties to a PostHog capture:

```typescript
// 1. Flatten walkerOS sections with settings.include
config: {
  settings: {
    apiKey: 'phc_...',
    include: ['data', 'globals'], // → data_*, globals_* on every event
  },
}

// 2. Override per-rule via mapping.settings.include
mapping: {
  order: {
    complete: {
      settings: {
        include: ['data', 'globals'], // EUR currency, totals, pagegroup
      },
    },
  },
}
```

PostHog has no dedicated revenue API — revenue events are regular `capture()`
calls with the revenue properties in the payload. Use `include: ['data']` on an
`order complete` rule to forward `data_total`, `data_currency` (e.g. `"EUR"`),
`data_shipping`, etc.

## Identity

Destination-level identify fires on the first push and re-fires only when the
resolved `distinctId` changes (runtime state diffing, skip redundant calls):

```typescript
settings: {
  apiKey: 'phc_...',
  identify: {
    map: {
      distinctId: 'user.id',
    },
  },
}
```

Per-event identify supports the full PostHog vocabulary — `distinctId`, `$set`
(person properties), `$set_once` (set-if-unset person properties). The
destination calls `posthog.identify(distinctId, $set, $set_once)`:

```typescript
mapping: {
  user: {
    login: {
      skip: true, // side-effect only, no capture() for user login
      settings: {
        identify: {
          map: {
            distinctId: 'data.user_id',
            $set: {
              map: {
                email: 'data.email',
                plan: 'data.plan',
              },
            },
            $set_once: {
              map: { first_login: 'timestamp' },
            },
          },
        },
      },
    },
  },
}
```

**Person properties without identity change.** When the resolved identify object
has no `distinctId`, the destination calls
`posthog.setPersonProperties($set, $set_once)` instead — useful for profile
updates that should not create a new identity:

```typescript
mapping: {
  profile: {
    update: {
      settings: {
        identify: {
          map: {
            $set: { map: { name: 'data.name' } },
          },
        },
      },
    },
  },
}
```

## Groups

PostHog's group analytics (Scale/Enterprise) aggregates events by company, team,
or any custom group type. Configure a group mapping at destination or rule level
— the destination calls `posthog.group(type, key, properties?)`:

```typescript
mapping: {
  company: {
    update: {
      skip: true,
      settings: {
        group: {
          map: {
            type: { value: 'company' },
            key: 'data.company_id',
            properties: {
              map: {
                name: 'data.company_name',
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

## Logout

`reset: true` (or any truthy mapping value) calls `posthog.reset()`, clearing
the distinct ID and generating a new anonymous one. Pair with `skip: true` so
the rule runs as a pure side effect:

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

## Consent

Declare the required consent keys on the destination via `config.consent`. A
`walker consent` event triggers the destination's `on('consent')` handler, which
checks every declared key against the event payload. If **all** required keys
are `true`, the destination calls `posthog.opt_in_capturing()`. Otherwise it
calls `posthog.opt_out_capturing()`, which stops capture, session replay, and
survey rendering.

```typescript
destinations: {
  posthog: {
    code: destinationPostHog,
    config: {
      consent: { analytics: true }, // required keys
      settings: { apiKey: 'phc_...' },
    },
  },
}
```

Without `config.consent` the destination takes no action on consent changes; the
walkerOS `config.consent` gate still blocks unconsented events from reaching the
destination in the first place.

## Built-in Features (Config Passthrough)

All these PostHog features work via standard `posthog-js` init options — no
destination wiring required:

- **Session replay** —
  `settings.session_recording: { maskAllInputs: true, ... }`
- **Feature flags** — `settings.bootstrap: { featureFlags: {...} }` for SSR,
  `settings.advanced_disable_flags: true` to disable entirely. Access flags
  directly via the `posthog` singleton.
- **Surveys** — automatic via the SDK; `settings.disable_surveys: true` opts out
- **Heatmaps** — `settings.capture_heatmaps: true`
- **Exception capture** — `settings.capture_exceptions: true`
- **Cookieless mode** — `settings.cookieless_mode: 'always' | 'on_reject'`
- **Person profiles** — `settings.person_profiles: 'identified_only'` (PostHog
  default, privacy-friendly) or `'always'`

For programmatic access to flags, surveys, or exception reporting, import the
SDK singleton directly:

```typescript
import posthog from 'posthog-js';
posthog.getFeatureFlag('my-flag');
posthog.captureException(error);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.

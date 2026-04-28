# LinkedIn Web Destination for walkerOS

Forward walkerOS events as LinkedIn Insight Tag conversions
(`window.lintrk('track', ...)`) - opt-in, per-event, with value + currency +
deduplication support.

## Source Code

[github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/linkedin](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/linkedin)

## NPM

[`@walkeros/web-destination-linkedin`](https://www.npmjs.com/package/@walkeros/web-destination-linkedin)

## Documentation

[walkeros.io/docs/destinations/web/linkedin](https://www.walkeros.io/docs/destinations/web/linkedin)

## Features

- **Opt-in conversion forwarding** - only events with
  `mapping.settings.conversion` fire a `lintrk('track')` call. Unmapped events
  are silently ignored (Campaign Manager requires pre-registered conversion
  rules).
- **Automatic page view + retargeting** - the Insight Tag script fires its own
  page view on load for audience building. The destination does not suppress or
  duplicate it.
- **Conversion value + currency** - `data.total`-style mappings with a currency
  fallback via `{ key, value }` syntax (defaults to `"EUR"`).
- **Deduplication ready** - maps the walkerOS event `id` to LinkedIn's
  `event_id`, ready for cross-channel deduplication with a future server
  (Conversions API) destination.
- **Consent-gated** - LinkedIn requires `marketing` consent. The collector's
  `config.consent` gate blocks events until granted; deferred script injection
  is supported via `loadScript: true`.
- **Script-tag loader** - no npm SDK dependency. The destination injects
  `https://snap.licdn.com/li.lms-analytics/insight.min.js` at runtime (opt-in
  via `loadScript: true`), or you can embed the Insight Tag snippet in your HTML
  and leave `loadScript: false`.

## Installation

```bash
npm install @walkeros/web-destination-linkedin
```

## Quick Start

```json
{
  "destinations": {
    "linkedin": {
      "package": "@walkeros/web-destination-linkedin",
      "config": {
        "consent": { "marketing": true },
        "loadScript": true,
        "settings": {
          "apiKey": "123456"
        },
        "mapping": {
          "order": {
            "complete": {
              "settings": {
                "conversion": {
                  "map": {
                    "id": { "value": 67890 },
                    "value": "data.total",
                    "currency": { "key": "data.currency", "value": "EUR" },
                    "eventId": "id"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Configuration

### Settings

| Key       | Type       | Required | Notes                                                                                                                                                                                          |
| --------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`  | `string`   | yes      | LinkedIn Partner ID (numeric string, e.g. `"123456"`). Find it in Campaign Manager → Insight Tag → Manage Insight Tag.                                                                         |
| `include` | `string[]` | no       | Event sections made available for mapping resolution. Present for consistency with other destinations - `lintrk()` only accepts four fixed fields, so included data is not automatically sent. |

### Mapping (per-event)

| Key                   | Resolved shape                        | Notes                                                                                                                                             |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings.conversion` | `{ id, value?, currency?, eventId? }` | Required for the event to fire. `id` → `conversion_id` (number). Others translate 1:1 to LinkedIn's `conversion_value` / `currency` / `event_id`. |

**Falsy guards:**

- If `id` resolves to falsy/zero → the entire `lintrk` call is skipped (no
  silent error).
- If `value` / `currency` / `eventId` resolve to falsy → those fields are
  omitted from the call (`id` still required).

## Events

### Opt-in model

LinkedIn is an **opt-in conversion platform**. Every tracked event must
reference a pre-created Conversion Rule in Campaign Manager via its numeric
`conversion_id`. Events without an explicit `mapping.settings.conversion` are
silently ignored - they produce zero `lintrk` calls.

This is the opposite of analytics destinations (Amplitude, Clarity, PostHog)
which forward every event by default.

### Conversion with value and deduplication

```json
"mapping": {
  "order": {
    "complete": {
      "settings": {
        "conversion": {
          "map": {
            "id": { "value": 67890 },
            "value": "data.total",
            "currency": { "key": "data.currency", "value": "EUR" },
            "eventId": "id"
          }
        }
      }
    }
  }
}
```

Resolves to:
`lintrk('track', { conversion_id: 67890, conversion_value: 555, currency: 'EUR', event_id: '<walker-event-id>' })`.

### Suppressing a fully configured rule

```json
"mapping": {
  "form": {
    "submit": {
      "silent": true,
      "settings": {
        "conversion": { "map": { "id": { "value": 12345 } } }
      }
    }
  }
}
```

`mapping.silent: true` suppresses the call while keeping the rule on disk for
quick reactivation. Alternatively, simply omit `settings.conversion` -
LinkedIn's opt-in model makes that equivalent.

## Consent

LinkedIn is an advertising platform. The Insight Tag falls under **marketing**
consent (not analytics):

```json
"config": {
  "consent": { "marketing": true }
}
```

walkerOS's collector blocks all events to this destination until `marketing` is
granted. When consent is later revoked, walkerOS stops sending events - the
LinkedIn Insight Tag itself has no `opt_out()` API, so the tag remains loaded
but receives no further calls.

### Deferred script load

If you want the Insight Tag script to load **only** after consent is granted,
set `loadScript: true` and leave `config.consent.marketing` un-granted at init
time. The destination will skip `addScript()` during init and inject the script
when an `on('consent')` event grants marketing.

## No identity tracking

LinkedIn identity on the web is cookie-based - the Insight Tag manages its own
first-party cookies and matches visitors against LinkedIn member profiles
server-side. There is no `lintrk('identify', ...)` API. The destination does
**not** forward user IDs, emails, phone numbers, or the `li_fat_id` click ID.

Click-ID capture (including `li_fat_id`) is the session source's responsibility.
A future `@walkeros/server-destination-linkedin` (Conversions API) will consume
`li_fat_id` from `user.device` for advanced matching.

## Future: Conversions API

A server-side Conversions API destination is planned as a follow-up, matching
the TikTok / Pinterest / Meta pattern. It will share the `event_id` field with
this web destination for cross-channel deduplication.

## Related

- Insight Tag official docs:
  [LinkedIn Help Center](https://www.linkedin.com/help/lms/answer/a427660)

# Pinterest Tag Web Destination for walkerOS

Forward walkerOS events to the Pinterest Tag (`window.pintrk`) for conversion
tracking, enhanced matching, and dynamic retargeting.

## Source Code

[github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/pinterest](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/pinterest)

## NPM

[`@walkeros/web-destination-pinterest`](https://www.npmjs.com/package/@walkeros/web-destination-pinterest)

## Documentation

[walkeros.io/docs/destinations/web/pinterest](https://www.walkeros.io/docs/destinations/web/pinterest)

## Features

- **Standard event taxonomy** — explicit `mapping.name` rename to Pinterest's
  lowercase concatenated names (`pagevisit`, `addtocart`, `checkout`,
  `viewcontent`, `lead`, `signup`, `search`, `custom`, ...).
- **Inline `line_items` for multi-product** — single
  `pintrk('track', 'checkout', { line_items: [...] })` call (NOT N separate
  calls). Built via the standard walkerOS `loop` mapping syntax.
- **Enhanced matching** — strict allow-list of `em` (email) and `external_id`.
  The Pinterest JS tag auto-hashes `em` with SHA-256 — the destination passes
  raw values through and never hashes.
- **Auto `event_id` for dedup** — every `pintrk('track', ...)` call attaches the
  walkerOS event `id` as `event_id`, ready for cross-channel deduplication with
  a future server (Conversions API) destination.
- **Consent-aware suppression** — `on('consent')` flips a runtime state flag.
  After revocation, subsequent track calls are suppressed even though Pinterest
  has no `opt_in`/`opt_out` SDK API.

## Installation

```bash
npm install @walkeros/web-destination-pinterest
```

## Quick Start

```json
{
  "destinations": {
    "pinterest": {
      "package": "@walkeros/web-destination-pinterest",
      "config": {
        "consent": { "marketing": true },
        "loadScript": true,
        "settings": {
          "apiKey": "2612345678901"
        },
        "mapping": {
          "page": {
            "view": { "name": "pagevisit" }
          },
          "order": {
            "complete": {
              "name": "checkout",
              "data": {
                "map": {
                  "value": "data.total",
                  "order_id": "data.id",
                  "currency": { "key": "data.currency", "value": "EUR" }
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

| Key          | Type                    | Required | Notes                                                                                                                                                                        |
| ------------ | ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`     | `string`                | yes      | Pinterest Tag ID (numeric string, e.g. `"2612345678901"`). Found in Pinterest Ads Manager under Conversions → Pinterest Tag. Passed to `pintrk('load', tagId)`.              |
| `pageview`   | `boolean`               | no       | Fire `pintrk('page')` once in init after `core.js` loads. Default `true`. Set `false` when walkerOS sources already emit page view events to avoid a duplicate initial fire. |
| `identify`   | `Mapping.Value`         | no       | Mapping value resolving to `{ em?, external_id? }`. Resolved on the first event and fired via `pintrk('set', data)` whenever the resolved identity changes.                  |
| `include`    | `string[]`              | no       | Sections to forward as prefixed properties in track payloads. Pinterest expects specific parameter names — explicit `mapping.data` is usually preferred over `include`.      |
| `loadScript` | `boolean` (on `config`) | no       | If `true`, the destination injects `https://s.pinimg.com/ct/core.js` on init. Set `false` when the host page already loads the Pinterest Tag snippet.                        |

### Mapping (per-event)

| Key                 | Resolved shape          | Notes                                                                                                                                           |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`              | Pinterest event string  | One of `pagevisit`, `addtocart`, `checkout`, `viewcontent`, `lead`, `signup`, `search`, `custom`, ... Forwarded as the second arg to `track()`. |
| `data` (top-level)  | `EventData`             | Standard walkerOS data resolution. The resolved object is sent verbatim as the third arg to `track()`.                                          |
| `settings.identify` | `{ em?, external_id? }` | Per-event identity override. Fires `pintrk('set', data)` BEFORE the track call when the resolved identity differs from the current state.       |
| `settings.include`  | `string[]`              | Overrides destination-level `include` for this rule.                                                                                            |
| `skip`              | `boolean`               | Process side effects (identify) but suppress the default `pintrk('track', ...)` call.                                                           |

## Event Mapping

Pinterest expects lowercase concatenated event names. The destination never
auto-maps — every conversion event needs an explicit `mapping.name`.

| walkerOS event   | Pinterest event | Notes                                                                              |
| ---------------- | --------------- | ---------------------------------------------------------------------------------- |
| `page view`      | `pagevisit`     | Fired automatically by `pintrk('page')` on init unless `settings.pageview: false`. |
| `product view`   | `viewcontent`   | Single product. Use `value`, `currency`, `product_id`, `product_name`.             |
| `product add`    | `addtocart`     | Single product. Wrap in `line_items` array if you also want item-level data.       |
| `order complete` | `checkout`      | Multi-product. Use `mapping.data.line_items.loop` to iterate `event.nested`.       |
| `site search`    | `search`        | Use `search_query` field.                                                          |
| `user login`     | `lead`          | Optional `lead_type`. Combine with `settings.identify` for enhanced matching.      |
| `user signup`    | `signup`        | Same identify pattern as `lead`.                                                   |
| (custom)         | `custom`        | Send Pinterest's `custom` event for non-standard conversions.                      |

## Multi-product checkout

Pinterest sends a SINGLE `pintrk('track', 'checkout', { line_items: [...] })`
call. The walkerOS `loop` mapping resolves a nested array INTO the data, NOT
into N separate SDK calls (different from Amplitude's per-item revenue pattern).

```json
"order": {
  "complete": {
    "name": "checkout",
    "data": {
      "map": {
        "value": "data.total",
        "order_id": "data.id",
        "currency": { "key": "data.currency", "value": "EUR" },
        "line_items": {
          "loop": [
            "nested",
            {
              "condition": "$code: (v) => typeof v?.data?.price === 'number'",
              "map": {
                "product_id": "data.id",
                "product_name": "data.color",
                "product_price": "data.price",
                "product_quantity": { "value": 1 }
              }
            }
          ]
        }
      }
    }
  }
}
```

## Enhanced Matching

Pinterest's web tag accepts two enhanced matching fields, both auto-hashed by
the JS tag:

| Field         | Source                             | Notes                                                    |
| ------------- | ---------------------------------- | -------------------------------------------------------- |
| `em`          | `data.email` / `user.email` / etc. | Pinterest auto-hashes — pass raw email, do NOT pre-hash. |
| `external_id` | `data.id` / `user.id`              | Stable user identifier. Auto-hashed by Pinterest.        |

The destination strictly limits to these two fields. CAPI-only fields (`ph`,
`fn`, `ln`, `address`, `country`, `ip`, `ua`) belong to the future server
destination and are intentionally not accepted here.

```json
"user": {
  "login": {
    "name": "lead",
    "settings": {
      "identify": {
        "map": {
          "em": "data.email",
          "external_id": "data.id"
        }
      }
    },
    "data": {
      "map": { "lead_type": { "value": "login" } }
    }
  }
}
```

Identity is diffed against the destination's runtime state —
`pintrk('set', ...)` only fires when the resolved identity actually changes.
Destination-level `settings.identify` is resolved lazily on the first event
(init has no event to bind to), so `pintrk('load', tagId)` is called without an
identity object.

## Consent

Pinterest is an advertising platform — the Pinterest Tag falls under
**marketing** consent:

```json
"config": {
  "consent": { "marketing": true }
}
```

walkerOS's collector blocks all events to this destination until `marketing` is
granted. **Pinterest has no `opt_in`/`opt_out` SDK API**, so the destination
implements consent revocation as a runtime suppression flag:

1. `on('consent')` reads `config.consent` to determine which keys to check.
2. If any required key resolves to `false`, the destination flips
   `_state.consentGranted = false` and silently suppresses all subsequent
   `pintrk('track', ...)` calls.
3. If consent is later re-granted (all required keys `true`), the flag flips
   back and tracking resumes.

The Pinterest Tag itself stays loaded throughout — only the walkerOS bridge goes
silent.

### Skipping a fully configured rule

```json
"user": {
  "update": {
    "skip": true,
    "settings": {
      "identify": {
        "map": { "em": "data.email", "external_id": "data.id" }
      }
    }
  }
}
```

`mapping.skip: true` processes side effects (the `pintrk('set', ...)` identity
update) but suppresses the default `pintrk('track', ...)` call. Useful when you
only want to refresh enhanced matching without firing a conversion.

## Future: Conversions API

A server-side Pinterest Conversions API destination is planned as a follow-up,
matching the Meta / TikTok / LinkedIn web+server split. It will share the
`event_id` field with this web destination for cross-channel deduplication.

## Related

- [Pinterest Tag documentation](https://help.pinterest.com/en/business/article/install-the-pinterest-tag)
- [Enhanced match documentation](https://help.pinterest.com/en/business/article/enhanced-match)
- walkerOS
  [understanding-destinations skill](https://www.walkeros.io/docs/destinations)

## License

MIT

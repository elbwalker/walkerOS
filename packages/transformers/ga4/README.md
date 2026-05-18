# @walkeros/transformer-ga4

Decode Google Analytics 4 Measurement Protocol v2 hits into walkerOS events.

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/transformers/ga4)
| [NPM](https://www.npmjs.com/package/@walkeros/transformer-ga4) |
[Documentation](https://www.walkeros.io/docs/transformers/ga4)

## Install

```bash
npm install @walkeros/transformer-ga4
```

## Wire it up

`transformer-ga4` is a `source.before` transformer. Drop it in front of any
server source that delivers the raw HTTP request to `ingest`:

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "sources": {
        "http": {
          "package": "@walkeros/server-source-express",
          "config": {
            "ingest": {
              "url": "req.url",
              "body": "req.body"
            }
          },
          "before": "ga4"
        }
      },
      "transformers": {
        "ga4": { "package": "@walkeros/transformer-ga4" }
      },
      "destinations": {
        "log": { "package": "@walkeros/destination-demo" }
      }
    }
  }
}
```

The transformer reads two keys from `ctx.ingest`:

| Key    | Type     | Required | Notes                                                |
| ------ | -------- | -------- | ---------------------------------------------------- |
| `url`  | `string` | yes      | Full request URL including the query string.         |
| `body` | `string` | no       | Raw POST body. Multi-event lines are `\n`-separated. |

If `url` is missing or not a string, the transformer drops the event silently.

## Default mappings

Out of the box, ~30 standard GA4 event names map to walkerOS event names:

| GA4 (`en`)          | walkerOS (`name`) | Notes                                  |
| ------------------- | ----------------- | -------------------------------------- |
| `page_view`         | `page view`       | `id`, `title`, `referrer` from hit     |
| `purchase`          | `order complete`  | id, currency, total, tax, shipping     |
| `view_item`         | `product view`    | currency, value                        |
| `add_to_cart`       | `product add`     | currency, value                        |
| `remove_from_cart`  | `product remove`  | currency, value                        |
| `view_cart`         | `cart view`       | currency, value                        |
| `begin_checkout`    | `order start`     | currency, value, coupon                |
| `add_shipping_info` | `order shipping`  | currency, value, tier                  |
| `add_payment_info`  | `order payment`   | currency, value, type                  |
| `refund`            | `order refund`    | id, currency, total                    |
| `add_to_wishlist`   | `wishlist add`    | currency, value                        |
| `view_item_list`    | `list view`       | id, name                               |
| `select_item`       | `product click`   | list_id, list_name                     |
| `view_promotion`    | `promotion view`  | reads from `items[0]`                  |
| `select_promotion`  | `promotion click` | reads from `items[0]`                  |
| `select_content`    | `content select`  | type, id                               |
| `scroll`            | `page scroll`     | percent                                |
| `click`             | `link click`      | url, domain, outbound                  |
| `file_download`     | `file download`   | name, extension, url                   |
| `video_start`       | `video start`     | title, duration, current, percent      |
| `video_progress`    | `video progress`  | same as video_start                    |
| `video_complete`    | `video complete`  | same as video_start                    |
| `form_start`        | `form start`      | id, name, destination                  |
| `form_submit`       | `form submit`     | id, name, destination                  |
| `search`            | `search submit`   | term                                   |
| `login`             | `session login`   | method                                 |
| `sign_up`           | `session signup`  | method                                 |
| `generate_lead`     | `lead generate`   | currency, value                        |
| `share`             | `content share`   | method, type, id                       |
| `user_engagement`   | (dropped)         | `ignore: true` by default              |
| `session_start`     | (dropped)         | `ignore: true` by default              |
| `first_visit`       | (dropped)         | `ignore: true` by default              |
| `*` (fallback)      | `ga4 track`       | `event_name` carries the original `en` |

See the [website docs](https://www.walkeros.io/docs/transformers/ga4) for the
authoritative reference.

## Override a default field

User config replaces matching default keys per event name. Untouched events keep
the default rule. To swap one mapped field on `purchase`:

```json
{
  "transformers": {
    "ga4": {
      "package": "@walkeros/transformer-ga4",
      "config": {
        "settings": {
          "mapping": {
            "purchase": {
              "name": "order complete",
              "data": {
                "map": {
                  "coupon": "params.ep.promo_code"
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

Replace semantics: the entire rule for `purchase` is taken from user config.
There is no additive merge inside `data.map` in v1 — copy the fields you want to
keep.

## Drop an event

Set `ignore: true` on any key:

```json
"mapping": {
  "click": { "ignore": true }
}
```

## Custom events

Either override `'*'` to change the fallback rule, or add a specific key for an
event you fire from `gtag('event', '<your_name>', ...)`:

```json
"mapping": {
  "newsletter_subscribe": {
    "name": "newsletter signup",
    "data": { "map": { "source": "params.ep.source" } }
  }
}
```

Unknown event names fall through to `'*'`, which by default emits a `ga4 track`
event with `data.event_name` set to the original `en`.

## Caveats

- **Replace semantics, not merge.** User mappings replace the matching default
  rule. There's no per-field merge.
- **GA4 v2 only.** The transformer assumes the v2 Measurement Protocol layout
  (`ep.`, `epn.`, `up.`, `upn.`, `prN`, `gcs`). v1 is out of scope.
- **`G-` tids only.** By default `tidPattern` is `^G-`, so Ads (`AW-`) and DC
  (`DC-`) hits are dropped. Override `settings.tidPattern` (string regex) to
  widen.
- **Basic `gcs` only.** Maps `G1XX` to `marketing`/`analytics` booleans.
  Functional/preferences flags and `gcd` are not decoded.
- **Body must be raw text.** The transformer parses POST bodies as URL-encoded
  form lines. If the source already JSON-parses the body, pass through the
  original string or skip this transformer.
- **`Ingest` contract.** The transformer reads `ctx.ingest.url` (required) and
  `ctx.ingest.body` (optional). Source wiring must populate them.

## Related

- [Documentation](https://www.walkeros.io/docs/transformers/ga4)
- [Transformers Overview](https://www.walkeros.io/docs/transformers)

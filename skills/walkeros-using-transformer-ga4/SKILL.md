---
name: walkeros-using-transformer-ga4
description:
  Use when wiring `@walkeros/transformer-ga4` into a server flow, overriding
  default GA4 event mappings, dropping events, adding custom event keys, or
  troubleshooting GA4 Measurement Protocol decoding. Covers the `before`-chain
  wiring contract, configuration recipes, and per-field patching with
  extend/remove.
---

# Using `@walkeros/transformer-ga4`

## Overview

`@walkeros/transformer-ga4` decodes Google Analytics 4 Measurement Protocol v2
hits (`/g/collect`, `/mp/collect`) into walkerOS events. It sits in a server
source's `before` chain, reads the raw HTTP request via `ctx.ingest`, and
returns one walkerOS event per GA4 event in the hit (one hit can carry many
events).

Boundaries: server-side decoding via `source-express`, GA4 v2 only, `G-` tids
only by default. Per-field patching via `extend`/`remove` is supported.

## When to use this skill

- You are wiring `transformer-ga4` into a server flow for the first time
- You want to override one of the 33 default GA4 mappings
- You need to drop a GA4 event (auto-fired noise like `user_engagement`)
- You want to add a custom event key for a `gtag('event', '<name>', ...)` call
- You need to widen `tidPattern` to accept Ads (`AW-`) or DC (`DC-`) traffic
- Events are not arriving and you suspect the decoder is silently dropping them

## Quickstart wiring

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

**Wiring rules:**

- `transformer-ga4` belongs in `source.before`, not `destination.before`.
  Decoding is a pre-collector concern: GA4 hits are not yet walkerOS events.
- The source must populate `ctx.ingest.url` (required, string) and
  `ctx.ingest.body` (optional, string). Raw text body only — pre-parsed JSON
  will not decode.
- One HTTP request can fan out to N walkerOS events. This requires the collector
  fan-out fix (shipped in this release).

This wiring contract (before-chain placement plus the `config.ingest` keys the
source must populate) is also surfaced as a package hint, so `package_get` on
`@walkeros/transformer-ga4` returns it without this skill.

## Configuration recipes

### Patch one field in a default mapping (extend + remove)

Use `extend` to add or override individual fields of a shipped default rule
without replacing it in full. Use `remove` to strip fields from the output.

The `purchase` default ships `id`, `currency`, `total`, `tax`, `shipping`, and
`coupon`. To add `affiliation` from a GA4 event parameter and drop `currency`:

```json
"transformers": {
  "ga4": {
    "package": "@walkeros/transformer-ga4",
    "config": {
      "settings": {
        "mapping": {
          "purchase": {
            "extend": {
              "data": { "map": { "affiliation": "params.ep.affiliation" } }
            },
            "remove": ["currency"]
          }
        }
      }
    }
  }
}
```

`extend.data.map` is deep-merged onto the default `data.map`, leaving `id`,
`total`, `tax`, `shipping`, and `coupon` intact. `remove: ["currency"]` strips
that field from the final payload. A `null` value in `extend` clears an
inherited field entirely (e.g. `"extend": { "name": null }`).

**Full replace:** if you need to rewrite a rule from scratch (no merge), omit
`extend` and `remove` and supply the complete rule directly. A rule with neither
keyword keeps the existing replace behavior.

```json
"settings": {
  "mapping": {
    "purchase": {
      "name": "order complete",
      "data": {
        "map": {
          "id": "params.ep.transaction_id",
          "total": "params.epn.value",
          "currency": "params.ep.currency",
          "coupon": "params.ep.promo_code"
        }
      }
    }
  }
}
```

### Drop an event

Set `ignore: true` on any key. This is how `user_engagement`, `session_start`,
and `first_visit` are silenced by default:

```json
"settings": {
  "mapping": {
    "click": { "ignore": true }
  }
}
```

### Add a custom event mapping

For events fired via `gtag('event', '<your_name>', ...)`:

```json
"settings": {
  "mapping": {
    "newsletter_subscribe": {
      "name": "newsletter signup",
      "data": {
        "map": { "source": "params.ep.source" }
      }
    }
  }
}
```

Unknown event names fall through to the `'*'` key, which by default emits
`ga4 track` with `data.event_name` set to the original `en`. Override `'*'` to
change the global fallback rule.

### Set a custom `tidPattern`

By default only `G-` tids are accepted. Widen via a string regex (compiled at
init):

```json
"settings": {
  "tidPattern": "^(G|AW|DC)-"
}
```

### Custom destination after decode

The transformer returns walkerOS events with `entity action` names. Anything
downstream of the collector treats them as native events — no GA4 awareness
needed:

```json
"destinations": {
  "bq": {
    "package": "@walkeros/server-destination-bigquery",
    "config": {
      "settings": {
        "project": "my-eu-project",
        "dataset": "events",
        "location": "EU"
      }
    }
  }
}
```

## Mapping path syntax

Mappings reference fields on the decoded `GA4Hit` shape via dotted paths:

| Path           | Meaning                                                   |
| -------------- | --------------------------------------------------------- |
| `params.ep.X`  | Event parameter (string), e.g. `params.ep.transaction_id` |
| `params.epn.X` | Event parameter (numeric), e.g. `params.epn.value`        |
| `params.up.X`  | User property (string)                                    |
| `params.upn.X` | User property (numeric)                                   |
| `items[0].X`   | First item in the items array                             |
| `items`        | Full items array (mapped to `nested` via item rules)      |

Use `params.ep.X` not `ep.X`. The decoder materializes the prefixed keys under
the `params` namespace.

## Troubleshooting

### No events arriving

1. Check that `source.config.ingest` populates `url` (required, string) and
   `body` (optional, string). Express source typically uses `req.url` +
   `req.body`.
2. Confirm `before: "ga4"` is set on the source, not on a destination.
3. Check the `tidPattern`: by default `^G-` blocks `AW-` / `DC-` traffic
   silently.
4. Confirm the request really is Measurement Protocol v2. v1 hits will not
   decode.

### Wrong field in the output event

1. Check the path syntax: `params.ep.X`, not `ep.X`.
2. Verify the GA4 hit actually carries the parameter. Use a debug destination to
   log the decoded `params` object.
3. If you used a full-replace rule (no `extend`), your `data.map` is the entire
   rule. Use `extend` to inherit the defaults and add only the fields you need.

### Batched POST drops events after the first

This was a pre-`0.1.0` bug in `@walkeros/collector`. The fix preserves fan-out
in `source.before` chains. Confirm both packages are on the same release wave
(transformer-ga4 `0.1.0` + collector minor bump).

### `gcs` consent not applied

v1 decodes basic `gcs` (`G1XX` → `marketing` / `analytics` booleans) only.
Functional/preferences flags and the newer `gcd` parameter are not decoded.
Override the consent path manually if you need richer mapping.

## Limitations

- **GA4 v2 only.** v1 Measurement Protocol is out of scope.
- **`G-` tids only by default.** Override `tidPattern` for Ads/DC.
- **Basic `gcs` only.** No `gcd`, no functional/preferences flags.
- **Raw text body required.** Pre-parsed JSON bodies will not decode.
- **Server-side only.** Web ingest via interception sources is not supported.

See the [website docs](https://www.walkeros.io/docs/transformers/ga4) for the
authoritative reference and the
[README](../../packages/transformers/ga4/README.md) for the in-repo summary.

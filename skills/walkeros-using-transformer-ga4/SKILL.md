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

Boundaries: server-side decoding in front of a server source, GA4 v2 only, `G-`
tids only by default. Per-field patching via `extend`/`remove` is supported.

## When to use this skill

- You are wiring `transformer-ga4` into a server flow for the first time
- You want to override one of the 33 default GA4 mappings
- You need to drop a GA4 event (auto-fired noise like `user_engagement`)
- You want to add a custom event key for a `gtag('event', '<name>', ...)` call
- You need to widen `tidPattern` to accept Ads (`AW-`) or DC (`DC-`) traffic
- Events are not arriving and you suspect the decoder is silently dropping them

## Quickstart wiring

**Pick the source by runtime before copying the example below.** gtag.js can
send several events in one POST body (one per line, as `text/plain`), so the
source must keep a non-JSON body as `ingest.body`. These server sources do:

- `@walkeros/server-source-express` (shown below), the source `runneros` and the
  `walkeros/flow` image serve. A `text/plain` body that is valid JSON is parsed;
  any other `text/plain` body reaches the decoder as the raw string.
- `@walkeros/server-source-fetch`: a `(Request) => Response` handler with no
  `port`, for a runtime that calls it (Cloudflare Workers, Deno, Bun, Node.js
  18+ with a fetch adapter), e.g.
  `export default { fetch: collector.sources.http.push }`. `runneros` and the
  `walkeros/flow` image cannot serve it (they only mount a source's Node
  `httpHandler`).
- `sourceCloudFunction` from `@walkeros/server-source-gcp` on Google Cloud
  Functions.
- `sourceLambda` from `@walkeros/server-source-aws` on AWS Lambda. It answers a
  POST without a body with 400, so body-less single-event hits are lost there.

The other sources take the same `ingest` and `before` config as the express
example. The fetch source also takes `paths`; none of them takes `port`.

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
            "settings": {
              "port": 8080,
              "paths": ["/g/collect"]
            },
            "ingest": {
              "map": {
                "url": { "key": "url" },
                "path": { "key": "path" },
                "method": { "key": "method" },
                "body": { "key": "body" }
              }
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

- The express source listens on `/collect` by default and matches paths exactly.
  gtag.js sends to `/g/collect`, so set `settings.paths` to `["/g/collect"]` (or
  the full path, if the collector URL carries a path prefix). Without it every
  GA4 hit gets a 404.
- On the website, point gtag at the collector origin:
  `gtag('config', 'G-XXXXXXXXXX', { server_container_url: 'https://collect.example.com' })`.
  gtag.js appends `/g/collect`. With the walkerOS gtag destination, set
  `settings.ga4.server_container_url` (or `settings.ga4.transport_url`). Hits
  then go to the collector instead of Google. The `/g/collect` suffix, the
  body-less single-event POST, and one-line-per-event batches are gtag.js
  behaviour, not a walkerOS contract: confirm them in the browser Network tab.
- `before: "ga4"` runs every request on the source through the decoder, and a
  request without GA4 parameters is dropped. If the source also receives
  walkerOS events (for example on `/collect`), gate the chain:
  `"before": { "match": { "key": "ingest.path", "operator": "eq", "value": "/g/collect" }, "next": "ga4" }`.
- Batched hits (several events in one POST body, one per line) reach the decoder
  through `server-source-express` as the raw `text/plain` string, alongside GET
  and body-less POST hits. A body sent as `application/json` must be valid JSON,
  or express answers 400 before the decoder runs.
- `transformer-ga4` belongs in `source.before`, not `destination.before`.
  Decoding is a pre-collector concern: GA4 hits are not yet walkerOS events.
- The source must populate `ctx.ingest.url` (required, string) and
  `ctx.ingest.body` (optional, string). Raw text body only: pre-parsed JSON will
  not decode. The express, fetch, GCP and AWS server sources keep a non-JSON
  `text/plain` body (gtag's batched POST) as the raw string in `ingest.body`;
  only a body that parses as JSON arrives parsed.
- One HTTP request can fan out to N walkerOS events.

**Common mistake:** `config.ingest` must be the `map` operator with direct field
paths on the request scope (no `req.` prefix), e.g.
`{ "map": { "url": { "key": "url" } } }`. The bare `{ "url": "req.url" }` form
is silently inert: without a `map` operator no field is extracted, so
`ctx.ingest` stays empty, the decoder reads no `url`, and the hit is dropped.

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

### Change the batch cap

`settings.maxEvents` (default `100`) caps the events decoded from one request. A
POST body with more non-empty lines is dropped whole, before decoding:

```json
"settings": {
  "maxEvents": 250
}
```

### Custom destination after decode

The transformer returns walkerOS events with `entity action` names. Anything
downstream of the collector treats them as native events — no GA4 awareness
needed:

```json
"destinations": {
  "bq": {
    "package": "@walkeros/server-destination-gcp",
    "import": "destinationBigQuery",
    "config": {
      "settings": {
        "projectId": "my-eu-project",
        "datasetId": "events",
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

## Hit-level fields on the decoded event

Set from the hit, each only when present, value as sent.

| Hit param           | Event field                                                  |
| ------------------- | ------------------------------------------------------------ |
| `dl`                | `source.url` (page URL)                                      |
| `dr`                | `source.referrer`                                            |
| `uid`, `cid`, `sid` | `user.id`, `user.device`, `user.session`                     |
| `ul`                | `user.language` (browser language)                           |
| `sr`                | `user.screenSize` (screen resolution)                        |
| `p`, `_p`, `_s`     | `source.platform`, `source.pageLoadId`, `source.hitSequence` |

- `globals` is left empty: `globals.language` is the site's language, not the
  visitor's. Mappings or destinations that read `globals.language` or
  `globals.screen` from decoded events must switch to `user.language` and
  `user.screenSize`.
- `timestamp` is the receive time (`Date.now()`), not the session start (`sid`).
  Event ids do not depend on it.
- `source.url` feeds server destinations that send a page URL (Meta, Snapchat,
  Pinterest, Bing, TikTok, Criteo, Piwik PRO; Piwik PRO skips events without it)
  and the fingerprint transformer's default `site` input. Fingerprint hashes of
  GA4-decoded events therefore change once on upgrade.

## Troubleshooting

### No events arriving

1. A 404 on `/g/collect` means the source does not listen there. Set
   `settings.paths` to include `/g/collect` (the express and fetch sources
   default to `/collect`).
2. Check that `source.config.ingest` is the `map` operator and populates `url`
   (required, string) and `body` (optional, string), e.g.
   `{ "map": { "url": { "key": "url" }, "body": { "key": "body" } } }`. A bare
   `{ "url": "req.url" }` object is silently inert and `ctx.ingest` is left
   empty.
3. Confirm `before: "ga4"` is set on the source, not on a destination.
4. Check the `tidPattern`: by default `^G-` blocks `AW-` / `DC-` traffic
   silently.
5. Confirm the request really is Measurement Protocol v2. v1 hits will not
   decode.
6. A POST body with more non-empty lines than `settings.maxEvents` (default
   `100`) is dropped whole. The client still gets a success response; the only
   trace is a `warn` log line with the line count and the cap. Raise the cap if
   your own server-to-server batches are larger.

### Wrong field in the output event

1. Check the path syntax: `params.ep.X`, not `ep.X`.
2. Verify the GA4 hit actually carries the parameter. Use a debug destination to
   log the decoded `params` object.
3. If you used a full-replace rule (no `extend`), your `data.map` is the entire
   rule. Use `extend` to inherit the defaults and add only the fields you need.

### Batched POST hits return 400

`@walkeros/server-source-express` only rejects a POST body that is sent as
`application/json` and does not parse. gtag.js sends `text/plain`, which express
keeps as the raw string. If a proxy in front of the collector rewrites the
content type to `application/json`, restore `text/plain`. Earlier express
releases parsed `text/plain` bodies as JSON too and answered these hits with
400; upgrade the source.

### `gcs` consent not applied

v1 decodes basic `gcs` (`G1XX` → `marketing` / `analytics` booleans) only.
Functional/preferences flags and the newer `gcd` parameter are not decoded.
Override the consent path manually if you need richer mapping.

## Limitations

- **GA4 v2 only.** v1 Measurement Protocol is out of scope.
- **`G-` tids only by default.** Override `tidPattern` for Ads/DC.
- **Basic `gcs` only.** No `gcd`, no functional/preferences flags.
- **Raw text body required.** Pre-parsed JSON bodies will not decode. Batched
  gtag POSTs (`text/plain`, one URL-encoded hit per line) reach `ingest.body`
  raw on the express source. Express source releases before the text body fix
  rejected them with 400 before the decoder ran; if batched hits answer 400,
  upgrade `@walkeros/server-source-express`.
- **At most `maxEvents` events per request.** Default `100`; a larger batch is
  dropped whole before decoding, because each event becomes its own push and a
  source's batch limit does not cover a raw text body.
- **Server-side only.** Web ingest via interception sources is not supported.

## Related Skills

- [walkeros-understanding-transformers](../walkeros-understanding-transformers/SKILL.md) -
  Transformer interface, return values, and before/next chaining this skill
  relies on
- [walkeros-understanding-mapping](../walkeros-understanding-mapping/SKILL.md) -
  The `data`/`map` path syntax used in the GA4 mapping recipes
- [walkeros-mapping-configuration](../walkeros-mapping-configuration/SKILL.md) -
  Mapping recipes for GA4 and other vendors
- [walkeros-using-cli](../walkeros-using-cli/SKILL.md) - Validate and simulate a
  flow that wires the GA4 transformer

See the [website docs](https://www.walkeros.io/docs/transformers/ga4) for the
authoritative reference and the
[README](../../packages/transformers/ga4/README.md) for the in-repo summary.

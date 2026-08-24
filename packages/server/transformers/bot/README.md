# @walkeros/server-transformer-bot

Server-side bot and AI-agent detection transformer for walkerOS.

Annotates events with an automation likelihood, a category saying what kind of
client it is, the identified product when there is one, and stable reason codes.
Never drops events: downstream destination mappings decide policy.

## Install

```bash
npm install @walkeros/server-transformer-bot
```

## Quick start

```typescript
import { startFlow } from '@walkeros/collector';
import { transformerBot } from '@walkeros/server-transformer-bot';

await startFlow({
  sources: {
    express: {
      package: '@walkeros/server-source-express',
      config: {
        ingest: {
          map: {
            userAgent: { key: 'headers.user-agent' },
            acceptLanguage: { key: 'headers.accept-language' },
            acceptEncoding: { key: 'headers.accept-encoding' },
            secFetchSite: { key: 'headers.sec-fetch-site' },
            secFetchMode: { key: 'headers.sec-fetch-mode' },
            secFetchDest: { key: 'headers.sec-fetch-dest' },
            secFetchUser: { key: 'headers.sec-fetch-user' },
            secChUa: { key: 'headers.sec-ch-ua' },
            secChUaMobile: { key: 'headers.sec-ch-ua-mobile' },
            secChUaPlatform: { key: 'headers.sec-ch-ua-platform' },
            accept: { key: 'headers.accept' },
            contentType: { key: 'headers.content-type' },
            referer: { key: 'headers.referer' },
            signatureAgent: { key: 'headers.signature-agent' },
            method: { key: 'method' },
          },
        },
      },
    },
  },
  transformers: {
    bot: {
      code: transformerBot,
      config: {
        settings: {
          // Pinning the context unlocks the context-dependent checks. A
          // literal pins every request; any Mapping.Value resolves per
          // request. See "Request context".
          context: 'beacon',
          // Declaring a name asserts the signal is wired, which unlocks the
          // absence-based checks for its family. See "Declared signals".
          input: {
            acceptLanguage: 'ingest.acceptLanguage',
            acceptEncoding: 'ingest.acceptEncoding',
            secFetchSite: 'ingest.secFetchSite',
            secFetchMode: 'ingest.secFetchMode',
            secFetchDest: 'ingest.secFetchDest',
            secChUa: 'ingest.secChUa',
          },
        },
      },
    },
  },
  destinations: {
    ga4: {
      package: '@walkeros/server-destination-google-ga4',
      before: 'bot',
      // mapping can filter: if (event.user.botScore > 50) drop
    },
  },
});
```

After the transformer runs:

```json
{
  "user": {
    "botScore": 0,
    "botCategory": "human"
  }
}
```

## Output fields

Every field takes `string | false` in `settings.output`. `false` disables it,
any dot path renames and reroutes it, and an `ingest.` prefix keeps it off the
analytics event and in pipeline scratch.

| Field         | Type                  | Default path         | Meaning                                                                                   |
| ------------- | --------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `botScore`    | `number` 0-99, `null` | `user.botScore`      | Automation likelihood. Higher = more automated. `null` means not measured, never "human". |
| `botCategory` | enum                  | `user.botCategory`   | What kind of client. Carries the confidence class.                                        |
| `botProduct`  | `string`              | `user.botProduct`    | Identified product, e.g. `ChatGPT-User`, `Googlebot`. Written only on a named match.      |
| `botReasons`  | `string[]`            | `ingest.bot.reasons` | Stable reason codes. Doubles as the pipeline's configuration diagnostic.                  |

`ingest` is shared by every event in a scope and the write is an assignment, so
if a `before`-chain step fans one input into several events,
`ingest.bot.reasons` reflects only the most recently scored one. That is
harmless for the diagnostic codes, which are identical for every event on a
given pipeline. A deployment that fans out and needs per-event scoring codes
should point `settings.output.botReasons` at an event path instead.

## Categories

| Value            | Assigned when                                                                                                                                    | Score  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `human`          | no evidence, or graded sum below the cut                                                                                                         | 0-24   |
| `suspicious`     | graded sum at or above the cut, nothing decisive                                                                                                 | 25-60  |
| `automation`     | isbot match, missing UA, or a value impossible for the pinned context                                                                            | 70-80  |
| `search-crawler` | search engine crawler (Googlebot, bingbot, Applebot, YandexBot, Baiduspider, PetalBot, …)                                                        | 90     |
| `seo-tool`       | commercial SEO crawler (AhrefsBot, SemrushBot, DotBot, MJ12bot, Screaming Frog)                                                                  | 90     |
| `monitor`        | uptime and synthetic monitoring, usually your own infrastructure (UptimeRobot, Pingdom, StatusCake)                                              | 90     |
| `link-preview`   | link unfurler, meaning a person just shared this URL (facebookexternalhit, Twitterbot, LinkedInBot, Slackbot, Discordbot, TelegramBot, WhatsApp) | 90     |
| `ai-agent`       | AI agent acting for a person (ChatGPT-User, Claude-User, Perplexity-User, Google-Agent)                                                          | 90     |
| `ai-crawler`     | AI training or search-index crawler (GPTBot, ClaudeBot, CCBot, OAI-SearchBot)                                                                    | 90     |
| `unknown`        | nothing resolvable at all                                                                                                                        | `null` |

Every UA-map match scores 90 regardless of kind: a match is a match, and ranking
them in the number would assert a confidence difference that does not exist. The
category carries the kind. `isbot` stays a rung lower at 80 because it is a
weaker statement, saying "this looks automated" without naming a product.

`botScore` is `null`, not omitted, for `unknown`. Events arrive as a request
body on an endpoint that may be open, so an inbound `user.botScore` is
client-controllable; writing `null` overwrites it and states "not measured",
while still evaluating false under a `botScore > 50` filter.

## Detection layers

Deterministic, most specific first, first match wins. The graded layer does not
run when one of these fires.

| Score | Category     | Trigger                                   |
| ----- | ------------ | ----------------------------------------- |
| 70    | `automation` | missing User-Agent                        |
| 90    | named        | AI agent or AI crawler UA map             |
| 90    | named        | non-AI crawler UA map                     |
| 80    | `automation` | `isbot`                                   |
| 75    | `automation` | a value impossible for the pinned context |

A UA-map match that co-occurs with a contradiction keeps its score, because the
client is still software, but loses its claimed identity: the category drops to
`automation`, no `botProduct` is written, and `identity_claim_contradicted`
appears in the reasons.

Graded, capped at 60, so the two layers never overlap and every score is
attributable to exactly one of them:

| Reason code                       | Weight |
| --------------------------------- | ------ |
| `ch_version_mismatch`             | 30     |
| `ch_missing_on_chromium`          | 25     |
| `accept_generic_on_typed_context` | 25     |
| `fetchmeta_missing_on_modern_ua`  | 15     |
| `fetchmeta_profile_mismatch`      | 15     |
| `accept_language_missing`         | 10     |
| `accept_encoding_missing`         | 5      |

These weights and the `suspiciousAt` default of 25 are provisional starting
values from vendor specs and published prior art, not calibrated against a
labelled corpus. The package's captured-headers fixture suite is what keeps them
safe to ship: a weight that misfires on a real browser capture fails a test.

Reason codes are a semver-stable public API. Deterministic codes are
`ua_missing`, `ua_isbot`, `ua_named_bot`, `identity_claim_contradicted`,
`fetchmeta_impossible_for_context`, `content_type_impossible_for_context` and
`ch_platform_contradiction`. `signature_agent_present` is informational and
makes no verification claim. A clean real browser on a fully wired pipeline
emits zero reasons.

## Declared signals: absent versus never wired

The package cannot tell "the client sent no `Sec-CH-UA`" from "the operator
never mapped `Sec-CH-UA` into `ingest`". Both arrive as `undefined`. Every
absence-based heuristic would therefore fire on a misconfigured pipeline and
mark real people as suspicious, which is the single most likely source of false
values in the whole design.

**So an absence-based heuristic runs only if its input name appears explicitly
in `settings.input`.** Reading still falls back to the defaults, so
presence-based detection works out of the box; but listing a name is you
asserting "this signal is wired in my pipeline", which is the only reliable
source of that fact. Listing a name with its own default path therefore costs
nothing and unlocks the check.

Until a family is declared, `ingest.bot.reasons` reports `ch_not_declared`,
`fetchmeta_not_declared` or `accept_not_declared`, naming exactly which mapping
to add to unlock which checks. The default experience is deliberately
conservative, and that is not a bug.

## Request context

The same header value means opposite things in different contexts. `Accept: */*`
from a browser UA is what every real browser sends on a beacon, and a strong bot
signal on an image pixel. So the context-dependent checks need to know how the
request was made.

`settings.context` is `BotContext | Mapping.Value`, which is three usable forms:

- **An enum literal**, one of
  `'auto' | 'navigation' | 'pixel' | 'beacon' | 'fetch' | 'server'`, pins one
  context for every request. Unset behaves like `'auto'`.
- **A per-request lookup**, resolved against `{ event, ingest }`: a dot-path
  string such as `'ingest.transport'`, or a `{ key }` / `{ value }` / `{ fn }`
  object.
- **A fallback array**, tried in order, e.g.
  `[{ key: 'ingest.transport' }, { value: 'beacon' }]`.

A bare string is always read as a lookup path, so a string that is not one of
the six literals must contain a dot: `'beacn'` fails schema validation instead
of silently becoming a lookup that resolves to nothing. The guard holds inside
the array too, so a literal there is written `{ value: 'beacon' }` and never the
bare `'beacon'`.

The lookup form is what lets a single instance serve a deployment that receives
beacons, pixels and fetches on the same endpoint. The sender annotates its URL
(`?transport=beacon` on the collect URL, `?transport=pixel` on the pixel embed),
the source lifts it with `transport: { key: 'query.transport' }`, and the
transformer resolves it per request. A query parameter is a claim by whoever
controls the sender: right for telling your own transports apart, worthless
against a client that wants to be scored as a beacon. For server truth, give
pixels their own route and derive the context from `ingest.path` instead. The
end-to-end recipe is on
[the website page](https://www.walkeros.io/docs/transformers/bot).

Pinning is the strong mode: you know your own routes, and pinning unlocks the
`Accept` shape check, the Fetch Metadata profile comparison and the beacon
`Content-Type` check. **`auto` never enables them.** Absence of `Sec-Fetch-*` is
both a signal worth scoring and the reason auto-derivation fails, and the
request method does not rescue it, so `auto` runs the context-independent checks
only and reports `context_undetermined`. Anything that resolves outside the
vocabulary falls back to `auto` as well, so a broken annotation degrades to
fewer checks rather than to the wrong profile. The failure mode is "we scored
less", never "we scored wrong". `server` means server-to-server ingestion and
disables every browser-shaped check.

The client-hint coherence family, the most discriminating header signal
available, is context-independent and works in every deployment.

## Supported sources

Header-driven scoring depends on what each source puts in its raw scope, because
`config.ingest` resolves dot paths by plain property access.

| Source             | Header access                                                            | Works with `{ key: 'headers.x' }` |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------- |
| express            | `req.headers`, a plain object, lowercased                                | yes                               |
| GCP Cloud Function | same, the Functions Framework request is Express-shaped                  | yes                               |
| AWS Lambda         | `event.headers`; API Gateway v1 preserves original casing, v2 lowercases | casing-dependent                  |
| fetch              | `request.headers` is a `Headers` instance, not own properties            | **no**                            |

The fetch row is a hard limit rather than a nuance: a `Headers` instance holds
its values internally, so `{ key: 'headers.user-agent' }` yields `undefined` and
header-driven scoring is unavailable there until that source normalizes its
headers into a plain object. If every event scores `unknown`, check this table
first.

## Category reachability

Which categories can appear at all depends on how events reach the pipeline,
because most named bots do not execute JavaScript. An empty category is usually
expected, not broken.

| Category                 | JS tag (beacon / fetch)                  | Image pixel    | Server-side / navigation |
| ------------------------ | ---------------------------------------- | -------------- | ------------------------ |
| `automation`             | yes                                      | yes            | yes                      |
| `search-crawler`         | **yes**, Googlebot renders with Chromium | yes            | yes                      |
| `monitor`                | some, those that drive a real browser    | yes            | yes                      |
| `seo-tool`               | rarely, a few render JS optionally       | yes            | yes                      |
| `ai-agent`, `ai-crawler` | no                                       | maybe          | yes                      |
| `link-preview`           | **no**                                   | essentially no | **yes**                  |

Link unfurlers fetch the URL server-side, parse `<head>` for Open Graph tags and
stop. They do not run JavaScript and do not fetch body images, so `link-preview`
is structurally invisible to a JS-tagged pipeline and genuinely valuable only
for server-side collection, where "a person shared this on LinkedIn" otherwise
looks identical to a scraper.

## Destination filtering recipes

Drop everything automated:

```sql
event.user.botScore > 50
```

Drop crawlers but keep the AI traffic a person triggered:

```sql
event.user.botScore > 50 AND event.user.botCategory != 'ai-agent'
```

Keep link unfurls, which mean somebody just shared the URL:

```sql
event.user.botCategory != 'link-preview'
```

AI visibility report:

```sql
event.user.botCategory IN ('ai-agent', 'ai-crawler'), grouped by event.user.botProduct
```

Cloudflare users: their `bot_score` runs the opposite way (1 = bot) because it
is a trust score. Ours matches its field name, so higher = more bot.

## Not yet implemented

- **Identity verification.** `settings.verify` (product to CIDR list), an
  in-package CIDR matcher, and a `botVerified` output. Nothing here can
  currently prove an identity, and a constant-`false` field would assert a check
  that never ran. `Signature-Agent` presence is recorded as an observation only.
- **Web Bot Auth signature verification.** Needs a JWKS fetch, so it needs an
  answer to async I/O in a transformer first.
- **Reverse DNS verification.** A DNS round trip would land on client-visible
  latency, since the express source acknowledges synchronously.
- **ASN / datacenter-IP detection.** Impossible without an embedded database
  (MaxMind GeoLite ASN is CC-BY-SA, incompatible with an MIT package) or a
  network call. Bring-your-own CIDR lists replace it.
- **TLS / JA4 fingerprinting and header ordering.** The input names `ja4` and
  `headerNames` are reserved and resolved, but nothing consumes them. `method`
  is resolved and currently unconsumed for the same reason: under the `auto`
  rule above there is nothing for a derived context to unlock.
- **Web-side runtime checks** (`navigator.webdriver`, `userAgentData`). Needs a
  browser source.
- **Behavioral signals** (rate, session shape). Needs a store.

## Limits

Will not catch: residential-proxy plus stealth-patched Chrome with realistic
behavior; paid CAPTCHA-solver farms; real-browser-as-a-service providers (Bright
Data, ScrapingBee, Browserbase, Browserless). For that threat model use
Cloudflare Bot Management, DataDome, or HUMAN.

Also undetectable at this layer, by construction: in-browser agents such as
Claude for Chrome and Microsoft Copilot Actions. They drive a real browser
session and produce headers identical to the underlying browser, so they
score 0.

A UA-map match is a claim, not proof. Screaming Frog ships Googlebot and Bingbot
presets, and any client can send any UA. Until identity verification ships,
treat `botProduct` as "what this client says it is".

The graded layer will occasionally mark real people `suspicious`: Android
WebViews send frozen UA strings with no client hints, enterprise Chrome policies
freeze the UA major, and UA-spoofing privacy extensions are genuinely
indistinguishable from UA-spoofing bots at the header layer. That is why those
signals are graded rather than deterministic, and why the category matters more
than the number.

## License

MIT

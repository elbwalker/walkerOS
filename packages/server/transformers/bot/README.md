# @walkeros/server-transformer-bot

Server-side bot and AI-agent detection transformer for walkerOS.

Annotates events with `user.botScore` (0-99, higher = more bot),
`user.agentScore` (0-99, higher = more AI agent), and optionally
`user.agentProduct` (matched UA substring). Never drops events — downstream
destination mappings decide policy.

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
          userAgent: 'req.headers.user-agent',
        },
      },
    },
  },
  transformers: {
    bot: { code: transformerBot },
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
    "agentScore": 0
  }
}
```

## What it detects (v1)

| Visitor                                                                   | botScore | agentScore | agentProduct         |
| ------------------------------------------------------------------------- | -------- | ---------- | -------------------- |
| Real browser (Chrome, Firefox, Safari, Edge)                              | 0        | 0          | —                    |
| Empty / missing User-Agent                                                | 70       | 0          | —                    |
| curl / wget / python-requests / well-known crawlers                       | 80       | 0          | —                    |
| AI training crawlers (GPTBot, ClaudeBot, CCBot, Bytespider, etc.)         | 95       | 95         | e.g. "GPTBot"        |
| AI search-index crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) | 95       | 95         | e.g. "PerplexityBot" |
| AI user-action agents (ChatGPT-User, Claude-User, Perplexity-User, etc.)  | 90       | 95         | e.g. "ChatGPT-User"  |

## Output paths

All three outputs are configurable via `settings.output`:

| Field          | Default path      | Notes                                                                                                       |
| -------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `botScore`     | `user.botScore`   | Set to `"ingest.bot.score"` to route to pipeline scratch instead of the event. Set to `""` to skip writing. |
| `agentScore`   | `user.agentScore` | v1 emits 0 or 95 only.                                                                                      |
| `agentProduct` | (off)             | Set to `"user.agentProduct"` or similar to enable.                                                          |

## Destination filtering recipes

Drop all bots:

```sql
event.user.botScore > 50
```

Drop crawlers but keep user-action AI traffic:

```sql
event.user.botScore > 50 AND event.user.agentProduct NOT LIKE '%-User'
```

AI traffic report:

```sql
event.user.agentScore > 50, grouped by event.user.agentProduct
```

## Not in v1 (planned for v1.1+)

These signals are deferred. The `settings.input` schema reserves the relevant
input field names so adding them in v1.1 will not be a breaking change.

- **Header consistency heuristics** — `Sec-Fetch-*` missing on Chromium UAs,
  `Sec-CH-UA` major version mismatch with UA, missing `Accept-Language`.
  Requires a structured-headers parser, GREASE filtering, and a captured-headers
  fixture suite to avoid false positives on WebView, Tor, corporate proxies, and
  old Safari.
- **ASN / datacenter-IP detection** — bring-your-own lookup function (the
  package will stay dependency-free; MaxMind GeoLite ASN's CC-BY-SA license
  precludes embedding).
- **Reverse DNS verification** for true `verified-bot` status (e.g. confirming
  Googlebot is actually Google).
- **Web-side runtime checks** — `navigator.webdriver`, `userAgentData` from a
  browser source.
- **Behavioral signals** (rate, session shape) — needs a store.
- **TLS / JA4 fingerprinting** — not application-layer reachable; would consume
  an upstream-injected `ja4` header if provided.
- **agentScore graduation** — v1 emits 0 or 95. v1.1 will use intermediate
  values (e.g. 70 for unverified UA claim, 99 for IP-reverse-DNS verified).

## Limits

Will not catch: residential-proxy + stealth-patched Chrome + realistic behavior;
paid CAPTCHA-solver farms (2Captcha residential, etc.);
real-browser-as-a-service providers (Bright Data, ScrapingBee, Browserbase,
Hyperbrowser, Browserless). For that threat model use Cloudflare Bot Management,
DataDome, or HUMAN.

## License

MIT

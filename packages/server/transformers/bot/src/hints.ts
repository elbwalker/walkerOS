import type { Hint } from '@walkeros/core';

const INGEST_MAP = {
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
  transport: { key: 'query.transport' },
};

const CONTEXT_FROM_TRANSPORT = [
  { key: 'ingest.transport' },
  { value: 'beacon' },
];

export const hints: Hint.Hints = {
  'ingest-prerequisite': {
    text: 'The bot transformer reads its signals from ctx.ingest (path "ingest.<name>" by default). The upstream server source must populate them via config.ingest, which MUST use the map operator with direct request field paths (no req. prefix); a bare object like { userAgent: "req.headers.user-agent" } is silently inert and leaves ingest empty. With nothing in ingest the score is null and the category is "unknown". The map is also where the request context enters: lift the sender annotation with transport: { key: "query.transport" } and one instance then serves every transport, see the transport-wiring hint.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            sources: {
              express: {
                package: '@walkeros/server-source-express',
                config: { ingest: { map: INGEST_MAP } },
              },
            },
            transformers: {
              bot: {
                package: '@walkeros/server-transformer-bot',
                config: { settings: { context: CONTEXT_FROM_TRANSPORT } },
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
  'transport-wiring': {
    text: 'settings.context accepts a Mapping.Value, so one instance covers a deployment that receives beacons, pixels and fetches at the same endpoint. The sender declares the transport, the source lifts it, the transformer resolves it per request: add ?transport=beacon to the collect URL and ?transport=pixel to the pixel embed URL, then map transport: { key: "query.transport" } in the source (the normalized express scope exposes the parsed query, so no extra plumbing is needed). Give the bot config a fallback array so unannotated senders still land on a sane profile: [{ "key": "ingest.transport" }, { "value": "beacon" }]. Mind the shape: a bare string is read as a lookup path and must contain a dot, so a literal inside the array is written { "value": "beacon" } and never "beacon". Anything that resolves outside the vocabulary falls back to "auto", which scores less rather than scoring wrong. A query parameter is a claim by whoever controls the sender, which is fine for separating your own transports and worthless against a client that wants to be scored as a beacon; when you need server truth instead, give pixels their own route and derive the context from the request path.',
    code: [
      {
        lang: 'html',
        code: '<img src="https://collect.example.com/px.gif?transport=pixel" width="1" height="1" alt="">',
      },
      {
        lang: 'json',
        code: JSON.stringify(
          {
            sources: {
              express: {
                package: '@walkeros/server-source-express',
                config: {
                  ingest: {
                    map: {
                      userAgent: { key: 'headers.user-agent' },
                      transport: { key: 'query.transport' },
                    },
                  },
                },
              },
            },
            transformers: {
              bot: {
                package: '@walkeros/server-transformer-bot',
                config: { settings: { context: CONTEXT_FROM_TRANSPORT } },
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
  'declared-signals': {
    text: 'Absence is ambiguous: "the client sent no Sec-CH-UA" and "the operator never mapped Sec-CH-UA" both arrive as undefined. So an absence-based check runs only when its input name appears explicitly in settings.input, which is you asserting the signal is wired. Reading still falls back to the defaults, so listing a name with its default path costs nothing and unlocks the check. Until then ingest.bot.reasons reports ch_not_declared, fetchmeta_not_declared or accept_not_declared, naming exactly which mapping to add.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            transformers: {
              bot: {
                package: '@walkeros/server-transformer-bot',
                config: {
                  settings: {
                    context: 'beacon',
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
          },
          null,
          2,
        ),
      },
    ],
  },
  'output-routing': {
    text: 'Outputs default to event.user.botScore, event.user.botCategory, event.user.botProduct and ingest.bot.reasons. Any value can be a dot path to rename and reroute the field, or false to disable it. An "ingest." prefix keeps a field off the analytics event while still routing on it downstream. Note that ingest is shared by every event in a scope and the write is an assignment, so if a before-chain step fans one input into several events, point botReasons at an event path to keep per-event attribution.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            transformers: {
              bot: {
                package: '@walkeros/server-transformer-bot',
                config: {
                  settings: {
                    output: {
                      botScore: 'ingest.bot.score',
                      botCategory: 'ingest.bot.category',
                      botProduct: false,
                      botReasons: 'ingest.bot.reasons',
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
  'destination-filtering': {
    text: 'Recommended destination-mapping recipes. Drop everything automated: botScore > 50. Drop crawlers but keep AI traffic a person triggered: botScore > 50 AND botCategory != "ai-agent". Keep link unfurls, which mean somebody just shared the URL: botCategory != "link-preview". AI visibility report: group by botProduct WHERE botCategory IN ("ai-agent", "ai-crawler"). Note that botScore is null for category "unknown", which means not measured rather than human, and evaluates false under a > 50 filter. The transformer never drops events; filtering is always a destination decision.',
  },
  'detection-scope': {
    text: 'Detection runs in two layers. Deterministic, first match wins: missing UA (70), AI agent or crawler UA map (90, with the category and product), non-AI crawler map for search engines, SEO tools, monitors and link unfurlers (90), isbot (80), and values impossible for the pinned context (75). Graded, capped at 60, when no deterministic rung fires: client-hint version mismatch, client hints missing on a Chromium UA, wildcard Accept on a typed context, Fetch Metadata missing or off-profile, and missing Accept-Language or Accept-Encoding. It will NOT catch: residential-proxy plus stealth Chrome with realistic behavior; in-browser agents such as Claude for Chrome, which drive a real session and are header-identical to it; UA-spoofing privacy tools. For commercial-grade detection use Cloudflare Bot Management, DataDome, or HUMAN.',
  },
};

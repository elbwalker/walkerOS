import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'ingest-prerequisite': {
    text: 'The bot transformer reads userAgent from ctx.ingest (path "ingest.userAgent" by default). The upstream server source must populate it via config.ingest, which MUST use the map operator with direct request field paths (no req. prefix); a bare object like { userAgent: "req.headers.user-agent" } is silently inert and leaves ingest empty. Without populated ingest the UA is empty and every event scores 70 (baseline for missing UA).',
    code: [
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
                    },
                  },
                },
              },
            },
            transformers: {
              bot: {
                package: '@walkeros/server-transformer-bot',
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
    text: 'Outputs default to event.user.botScore and event.user.agentScore. Redirect to ingest.* to keep the analytics event clean while still routing on the score downstream. Empty string (or omit) skips writing that field entirely. agentProduct is off by default — set it to enable writing the matched UA substring.',
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
                      agentScore: 'ingest.bot.agent',
                      agentProduct: 'user.agentProduct',
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
    text: 'Recommended destination-mapping recipes. Drop all bots: botScore > 50. Drop crawlers but keep user-action AI traffic: botScore > 50 AND agentProduct NOT LIKE "%-User". AI traffic report: group by agentProduct WHERE agentScore > 50. The transformer never drops events — filtering is always a destination decision.',
  },
  'detection-scope': {
    text: 'v1 is UA-only: wraps isbot (curl, wget, headless Chrome defaults, well-known crawlers) plus a curated AI-agent UA map (OpenAI, Anthropic, Perplexity, Mistral, Meta, Google, Apple, Amazon, DuckDuckGo, ByteDance, Common Crawl). It will NOT catch: residential-proxy + stealth Chrome + realistic behavior; reverse-DNS-verified search engines; client-side runtime tells. v1.1 adds header consistency heuristics (Sec-Fetch, Sec-CH-UA, Accept-Language) with proper GREASE handling. For commercial-grade detection use Cloudflare Bot Management, DataDome, or HUMAN.',
  },
};

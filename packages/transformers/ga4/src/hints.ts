import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  wiring: {
    text: "This is a request-decoder: it reads the raw GA4 hit from ctx.ingest (ctx.ingest.url, optional ctx.ingest.body) and decodes it into walkerOS events. Place it on a server source's before chain (source.before), NOT on source.next and NOT on a destination.before chain — it runs before the collector to turn the incoming request into events. The source populates ctx.ingest from its config.ingest: { url, body }. Map url to the full request URL (query string included) and body to the raw request text. A pre-parsed JSON body will not decode — pass the raw body text.",
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            sources: {
              http: {
                package: '@walkeros/server-source-express',
                config: {
                  ingest: { url: 'req.url', body: 'req.body' },
                },
                before: 'ga4',
              },
            },
            transformers: {
              ga4: { package: '@walkeros/transformer-ga4' },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
};

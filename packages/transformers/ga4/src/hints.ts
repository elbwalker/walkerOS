import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  wiring: {
    text: "This is a request-decoder: it reads the raw GA4 hit from ctx.ingest (ctx.ingest.url, optional ctx.ingest.body) and decodes it into walkerOS events. Place it on a server source's before chain (source.before), NOT on source.next and NOT on a destination.before chain; it runs before the collector to turn the incoming request into events. The source populates ctx.ingest from its config.ingest, which MUST be a map operator: { map: { url: { key: 'url' }, path: { key: 'path' }, method: { key: 'method' }, body: { key: 'body' } } }. The keys are direct fields on the Express req (no req. prefix): url is the full request URL with query string (what the decoder reads), path drives the /g/collect before match, method and body carry POST batches. A bare object like { url: 'req.url' } is silently inert: with no map operator the source passes the whole req through getMappingValue, a real Express req fails the property check (it carries functions and circular refs), ctx.ingest stays empty, and the decoder skips the hit. A pre-parsed JSON body will not decode; pass the raw body text.",
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            sources: {
              http: {
                package: '@walkeros/server-source-express',
                config: {
                  ingest: {
                    map: {
                      url: { key: 'url' },
                      path: { key: 'path' },
                      method: { key: 'method' },
                      body: { key: 'body' },
                    },
                  },
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

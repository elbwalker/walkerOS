import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  wiring: {
    text: "This is a request-decoder: it reads the raw GA4 hit from ctx.ingest (ctx.ingest.url, optional ctx.ingest.body) and decodes it into walkerOS events. Place it on a server source's before chain (source.before), NOT on source.next and NOT on a destination.before chain; it runs before the collector to turn the incoming request into events. The source populates ctx.ingest from its config.ingest, which MUST be a map operator: { map: { url: { key: 'url' }, path: { key: 'path' }, method: { key: 'method' }, body: { key: 'body' } } }. The keys are direct field paths on the request scope (no req. prefix): url is the full request URL with query string (what the decoder reads), path drives the /g/collect before match, method and body carry POST batches. A bare object like { url: 'req.url' } is silently inert: without an operator no field is extracted, ctx.ingest stays empty, and the decoder skips the hit. A pre-parsed JSON body will not decode; pass the raw body text. The express source listens on /collect by default and matches paths exactly; gtag.js sends to /g/collect, so set settings.paths: ['/g/collect'] or every hit gets a 404.",
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            sources: {
              http: {
                package: '@walkeros/server-source-express',
                config: {
                  settings: { paths: ['/g/collect'] },
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
  'source-choice': {
    text: 'gtag.js sends a single event as a POST without a body (parameters in the query string) and several events as one text/plain POST body, one event per line. @walkeros/server-source-express keeps a text/plain body that is not JSON as ingest.body, so it decodes GET, body-less POST and batched POST hits alike. @walkeros/server-source-fetch and sourceCloudFunction (@walkeros/server-source-gcp) do too, with the same ingest and before config. sourceLambda (@walkeros/server-source-aws) answers a POST without a body with 400, so single-event hits sent that way are lost on Lambda.',
  },
};

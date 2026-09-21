import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'ingest-prerequisite': {
    text: 'Fields starting with ingest.* require the server source to have config.ingest configured. config.ingest MUST use the map operator with direct request field paths (no req. prefix); a bare object like { ip: "req.ip" } is silently inert and leaves ingest empty. Without populated ingest, all ingest.* fields resolve to empty strings, the hash is still generated but not unique. Always pair this transformer with a source that extracts request metadata.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            sources: {
              express: {
                package: '@walkeros/server-source-express',
                config: {
                  settings: { port: 8080 },
                  ingest: {
                    map: {
                      ip: { key: 'ip' },
                      userAgent: { key: 'headers.user-agent' },
                      origin: { key: 'headers.origin' },
                    },
                  },
                },
              },
            },
            transformers: {
              fingerprint: {
                package: '@walkeros/server-transformer-fingerprint',
                config: {
                  settings: {
                    fields: ['ingest.ip', 'ingest.userAgent'],
                    output: 'user.hash',
                    length: 16,
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
  'fields-overview': {
    text: "Fields resolve from { event, ingest } via walkerOS mapping. Common patterns: ingest.ip (client IP), ingest.userAgent (browser UA), event.data.* (any event property). For time-based rotation use fn fields: daily rotation with toISOString().slice(0,10), monthly with toISOString().slice(0,7). Order matters: the same fields in a different order produce a different hash. To transform a value before hashing, use fn alone: it receives { event, ingest } and returns the value, e.g. { fn: ({ ingest }) => String(ingest.ip || '').replace(/\\.\\d+$/, '.0') } hashes the /24 subnet (see the ipAnonymization step example). A fn next to a key never runs.",
  },
};

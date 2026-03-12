import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'ingest-prerequisite': {
    text: 'Fields starting with ingest.* require the server source to have config.ingest configured. Without it, ingest is undefined and all ingest.* fields resolve to empty strings — the hash is still generated but not unique. Always pair this transformer with a source that extracts request metadata.',
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
                    ip: 'req.ip',
                    userAgent: 'req.headers.user-agent',
                    origin: 'req.headers.origin',
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
    text: 'Fields resolve from { event, ingest } via walkerOS mapping. Common patterns: ingest.ip (client IP), ingest.userAgent (browser UA), event.data.* (any event property). For time-based rotation use fn fields: daily rotation with toISOString().slice(0,10), monthly with getDate(). Order matters — same fields in different order produce different hashes. Use { key, fn } objects to transform before hashing (e.g., IP anonymization via the ipAnonymization step example).',
  },
};

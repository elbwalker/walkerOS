import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'ingest-prerequisite': {
    text: 'The default inputs ip and userAgent read ingest.ip and ingest.userAgent, so the server source must have config.ingest configured. config.ingest MUST use the map operator with direct request field paths (no req. prefix); a bare object like { ip: "req.ip" } has no operator: walkeros validate and the bundle reject it (MAPPING_VALUE_NO_OPERATOR), and at runtime the collector logs an ERROR and ingest stays empty. An input that resolves empty logs one warning ("Fingerprint input ... resolved empty") and the hash is still generated, but less distinct. Behind a proxy the request ip is the address of the proxy: map the single-address header the proxy sets, or follow the Express source docs, section "Client IP behind a proxy". An ip that is not one address is reported as an error and left out of the hash.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            sources: {
              express: {
                package: '@walkeros/server-source-express',
                next: 'fingerprint',
                config: {
                  settings: { port: 8080 },
                  ingest: {
                    map: {
                      ip: { key: 'headers.x-client-ip' },
                      userAgent: { key: 'headers.user-agent' },
                    },
                  },
                },
              },
            },
            transformers: {
              fingerprint: {
                package: '@walkeros/server-transformer-fingerprint',
                config: {
                  settings: { salt: '$env.FINGERPRINT_SALT' },
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
  'salt-and-rotation': {
    text: 'The salt keys the hash (HMAC), so it cannot be recomputed or reversed to the IP without it. Pass it via $env so it stays out of the flow file, and use one salt per deployment. The salt is required: without it the flow does not start (Config settings salt missing). Rotation is built in (daily by default, UTC windows): do not add a date field for it. For another window, set rotate: "none" and add the window as a field. Setting fields switches the default inputs off, so name them too: { rotate: "none", ip: "ingest.ip", userAgent: "ingest.userAgent", site: "event.source.url", fields: [{ fn: () => new Date().toISOString().slice(0, 7) }] } rotates monthly. rotate: "none" without such a field keeps one hash per visitor indefinitely, which is a privacy decision, not a default.',
  },
  'site-sources': {
    text: 'site defaults to the hostname of event.source.url, which the walkerOS browser and dataLayer sources set on every event and transformer-ga4 sets from the page URL of the hit (dl). Events without source.url (server-side events, GA4 hits without dl) need site pointed elsewhere: an ingest path such as ingest.property (a path parameter) or ingest.origin (map it in config.ingest first, e.g. origin: { key: "headers.origin" }), or a static { value: "example.com" }. site keeps one visitor apart across sites when one collector with one salt serves several of them; a single-site deployment with its own salt is already separated by the salt.',
  },
  'extra-fields': {
    text: 'fields adds values to the hash as they resolve from { event, ingest }, in order. When fields is set, the named inputs ip, userAgent and site are only used if set explicitly, so an existing fields config keeps its input set. To transform a value before hashing, use fn alone: it receives { event, ingest } and returns the value. A fn next to a key never runs. The IP never needs a custom fn: the ip input anonymizes it (IPv4 /24, IPv6 /48).',
  },
};

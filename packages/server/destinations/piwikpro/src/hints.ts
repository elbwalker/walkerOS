import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'ingest-prerequisite': {
    text: 'The ip, userAgent and language settings read ingest.ip, ingest.userAgent and ingest.language first, then event.user. The server source must fill ingest via config.ingest with the map operator and direct request paths (no req. prefix). Without it Piwik PRO receives no client IP, user agent or language, and geolocates every hit to the server.',
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
                      language: { key: 'headers.accept-language' },
                    },
                  },
                },
              },
            },
            destinations: {
              piwikpro: {
                package: '@walkeros/server-destination-piwikpro',
                config: {
                  settings: {
                    url: 'https://your_account_name.piwik.pro/',
                    appId: 'XXX-XXX-XXX-XXX-XXX',
                  },
                  batch: { size: 100, wait: 1000 },
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
  'batch-size': {
    text: 'Set batch: { size: 100, wait: 1000 } so each flushed batch becomes one bulk request to ppms.php, goal hits included. A bare number such as batch: 500 sets only wait, and the default size cap is 1000 entries. Skipped entries are dropped from the request; a transport failure fails the whole batch.',
  },
  'identified-consent': {
    text: 'identified controls identified versus anonymous hits. Absent or true identifies every hit. false makes every hit anonymous: uia=1 and dda=1 are sent, _id and uid are dropped, cip is kept for country-level geolocation. A consent object like { marketing: true } identifies a hit when any listed state is granted, e.g. config.consent: { analytics: true } gates tracking and identified: { marketing: true } gates identification. Do not repeat the identified states in config.consent, or events wait for that consent and never reach the destination.',
  },
  'custom-dimensions': {
    text: 'customDimensions is keyed by bare dimension id, like { "1": "data.size" }, and each value is a mapping value resolved per event. Every hit carries dimension{id}=value. Precedence per key: destination settings, then rule settings, then a dimensions object passed as the method argument (trackEvent, trackGoal, trackSiteSearch and trackLink take one).',
  },
  'portable-methods': {
    text: 'rule.name is a Piwik PRO JavaScript method and data resolves to its positional arguments (use set for several). The server builds hits for 13 methods: trackPageView, trackEvent, trackGoal, trackSiteSearch, trackLink, trackContentImpression, trackContentInteraction, ecommerceProductDetailView, ecommerceAddToCart, ecommerceRemoveFromCart, ecommerceCartUpdate, ecommerceOrder and ping. A web destination mapping copied to the server produces the same hits. State setters such as setUserId are web only; any other method is skipped with a warning.',
  },
  'unmapped-events': {
    text: 'A page view without rule.name becomes trackPageView. Any other event without rule.name sends only its goal when the rule has settings.goalId, and is otherwise skipped with a warning (once per event name, then at debug level). A named rule with silent: true also sends only its goal. To keep other events out of the destination entirely, ignore everything with a wildcard and map what you need: { "*": { "*": { "ignore": true } }, "page": { "view": {} } }.',
  },
  'visitor-id': {
    text: 'visitorId defaults to event.user.device and is sent as _id. A 16 character hex value passes through, anything else is hashed to 16 hex characters, so walkerOS device ids always hash. For cookieless tracking, run the fingerprint transformer with output user.hash and length 16, and set visitorId: "event.user.hash".',
  },
  'link-tracking': {
    text: 'The server cannot track outlinks and downloads automatically the way enableLinkTracking does in the browser. Tag the link and map its event to trackLink, with data set to the address and "link" or "download".',
  },
};

import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'identified-consent': {
    text: 'settings.identified controls identified or anonymous tracking. Absent or true: identified, the Piwik PRO default. false: anonymous from init, without tracker cookies (disableCookies, deleteCookies, setUserIsAnonymous(true)). A consent object like { "marketing": true }: anonymous and cookieless until that consent is granted, then enableCookies and deanonymizeUser merge the anonymous session into the identified visitor. Keep config.consent for the states that gate tracking at all; do not repeat the identified states there, or events are queued and never reach the destination.',
    code: [
      {
        lang: 'json',
        code: '{ "consent": { "analytics": true }, "settings": { "identified": { "marketing": true } } }',
      },
    ],
  },
  'custom-dimensions': {
    text: 'customDimensions maps bare dimension ids to Mapping Values, at destination level (every hit) and at rule level (wins per key); a dimensions object the mapping passes as the method argument wins over both. trackEvent, trackGoal, trackSiteSearch and trackLink get { "dimension<id>": value } as their dimensions argument, values percent-encoded. Every other portable method (trackPageView, the content and ecommerce methods, ping) is wrapped: setCustomDimensionValue before the hit, then rule-only dimensions are deleted and destination values set again, so rule values never leak into automatic hits such as outlinks. Requires Piwik PRO tracker 15.3 or later.',
    code: [
      {
        lang: 'json',
        code: '{ "settings": { "customDimensions": { "1": "globals.pagegroup" } }, "mapping": { "product": { "add": { "name": "trackEvent", "data": { "set": ["entity", "action", "data.name"] }, "settings": { "customDimensions": { "2": "data.size" } } } } } }',
      },
    ],
  },
  'portable-methods': {
    text: 'rule.name is a Piwik PRO JS API method and data resolves to its positional arguments (an array built with set is spread). The 13 portable methods (trackPageView, trackEvent, trackGoal, trackSiteSearch, trackLink, trackContentImpression, trackContentInteraction, ecommerceProductDetailView, ecommerceAddToCart, ecommerceRemoveFromCart, ecommerceCartUpdate, ecommerceOrder, ping) copy unchanged to the server destination @walkeros/server-destination-piwikpro. Any other _paq command, such as setUserId, works on web by explicit name but is web-only.',
    code: [
      {
        lang: 'json',
        code: '{ "order": { "complete": { "name": "trackEvent", "data": { "set": ["entity", "action", "data.id"] }, "settings": { "goalId": "goal-uuid", "goalValue": "data.total" } } } }',
      },
    ],
  },
  'unmapped-events': {
    text: 'An event without a rule name that is not a page view sends only its goal when the rule has settings.goalId, and is otherwise skipped with a warning (once per event name, then at debug level). A named rule with silent: true also sends only its goal. To keep other events out of the destination entirely, ignore everything with a wildcard and keep the page view explicitly.',
    code: [
      {
        lang: 'json',
        code: '{ "mapping": { "*": { "*": { "ignore": true } }, "page": { "view": {} } } }',
      },
    ],
  },
};

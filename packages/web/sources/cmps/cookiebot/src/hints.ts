import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'consent-implied': {
    text: "explicitOnly (default true) reports only consent the visitor actively gave, Cookiebot consent.method 'explicit'. Cookiebot sets implied consent on its own for visitors outside the regions where the site asks for consent, for an implied-consent banner, and for old consents of unknown method. For these visitors the source emits no walker consent command: destinations gated with consent queue their events until the visitor makes an explicit choice, and a visitor Cookiebot never asks never sends consent, so those destinations never deliver that visitor's events. Set explicitOnly to false to follow the consent Cookiebot implied.",
    code: [{ lang: 'json', code: '{ "settings": { "explicitOnly": false } }' }],
  },
  'troubleshoot-google-consent-mode': {
    text: 'Cookiebot sends Google Consent Mode updates itself unless its script tag carries data-consentmode="disabled". The gtag destination does the same with its como setting, so with both on Google receives every update twice. Keep one: disable it on the Cookiebot script tag, or set "como": false on the gtag destination.',
    code: [
      {
        lang: 'html',
        code: '<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="00000000-0000-0000-0000-000000000000" data-consentmode="disabled"></script>',
      },
      {
        lang: 'json',
        code: '{ "gtag": { "package": "@walkeros/web-destination-gtag", "config": { "settings": { "como": false } } } }',
      },
    ],
  },
};

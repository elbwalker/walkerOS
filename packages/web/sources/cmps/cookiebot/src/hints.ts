import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'consent-implied': {
    text: "explicitOnly (default true) reports only consent the visitor actively gave, Cookiebot consent.method 'explicit'. Cookiebot sets implied consent on its own for visitors outside the regions where the site asks for consent, for an implied-consent banner, and for old consents of unknown method. For these visitors the source emits no walker consent command, so steps that require consent wait until the visitor decides. Set explicitOnly to false to follow the consent Cookiebot implied.",
    code: [{ lang: 'json', code: '{ "settings": { "explicitOnly": false } }' }],
  },
  'troubleshoot-google-consent-mode': {
    text: 'Cookiebot sends Google Consent Mode updates itself unless its script tag carries data-consentmode="disabled". The gtag destination does the same with its como setting, so with both on Google receives every update twice. Keep one: disable it on the Cookiebot script tag, or set "como": false on the gtag destination.',
    code: [{ lang: 'json', code: '{ "settings": { "como": false } }' }],
  },
};

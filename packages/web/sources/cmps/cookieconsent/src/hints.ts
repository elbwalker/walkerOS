import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'troubleshoot-esm-global': {
    text: "The source reads the decision through window.CookieConsent. The UMD build, the script the CookieConsent docs load from a CDN, defines that global. The ESM import (import * as CookieConsent from 'vanilla-cookieconsent') defines none, so every decision event logs the ERROR line 'window.CookieConsent is missing' and no consent is sent. Assign the import to window.CookieConsent before CookieConsent.run.",
    code: [
      {
        lang: 'javascript',
        code: "import * as CookieConsent from 'vanilla-cookieconsent';\nwindow.CookieConsent = CookieConsent;",
      },
    ],
  },
  'consent-waits-for-a-valid-decision': {
    text: 'The source sends a walker consent command only while CookieConsent.validConsent() is true. On a first visit with the banner open, after a change of the revision number, in opt-out mode before the visitor decides (the enabled default categories are no decision), and under Global Privacy Control with respectGpc, where the banner does not open, CookieConsent holds no valid decision and the source sends nothing. Destinations gated with consent queue their events until the visitor decides, so a visitor who never decides never sends consent.',
  },
  'troubleshoot-automated-browser': {
    text: "CookieConsent's hideFromBots option, true by default, stops CookieConsent for automated browsers such as Playwright, Selenium or Puppeteer (navigator.webdriver) and for bot user agents. It then reads no stored choice and fires no event, so the source sends no consent and gated destinations never deliver in such a test. In a test setup, set hideFromBots to false in CookieConsent.run.",
    code: [
      {
        lang: 'javascript',
        code: 'CookieConsent.run({\n  hideFromBots: false,\n  categories: { necessary: { readOnly: true }, analytics: {}, ads: {} },\n});',
      },
    ],
  },
};

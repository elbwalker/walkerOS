---
'@walkeros/web-source-cmp-cookieconsent': patch
---

New consent source for CookieConsent by orestbida (v3). It reads the visitor's
decision through `window.CookieConsent` and its `cc:onConsent` and `cc:onChange`
events, sends every rejected category as `false`, and maps the `ads` category to
`marketing`. It waits for a valid decision, so nothing is sent before the
visitor chooses, in opt-out mode too, or after a revision change until the
visitor decides again.

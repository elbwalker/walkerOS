# @walkeros/web-source-cmp-cookieconsent

## 4.10.0

### Patch Changes

- afff8a2: New consent source for CookieConsent by orestbida (v3). It reads the
  visitor's decision through `window.CookieConsent` and its `cc:onConsent` and
  `cc:onChange` events, sends every rejected category as `false`, and maps the
  `ads` category to `marketing`. It waits for a valid decision, so nothing is
  sent before the visitor chooses, in opt-out mode too, or after a revision
  change until the visitor decides again.
- Updated dependencies [61030f8]
- Updated dependencies [527c632]
- Updated dependencies [0af174a]
- Updated dependencies [61030f8]
- Updated dependencies [61030f8]
- Updated dependencies [777c48d]
- Updated dependencies [777c48d]
- Updated dependencies [6d59900]
- Updated dependencies [6d59900]
- Updated dependencies [e3744e4]
- Updated dependencies [28df061]
- Updated dependencies [ffd9795]
- Updated dependencies [425c9b0]
- Updated dependencies [777c48d]
- Updated dependencies [f1745d7]
  - @walkeros/core@4.10.0
  - @walkeros/collector@4.10.0

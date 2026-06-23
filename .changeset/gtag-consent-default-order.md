---
'@walkeros/web-destination-gtag': patch
---

Consent Mode now sets the denied `consent default` before `config`, as Google
requires. Add `como_advanced` to enable advanced mode (default at page load with
`wait_for_update`) for non-EU setups. Sites that do not use consent are
unaffected.

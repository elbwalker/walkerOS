---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/storybook-addon': patch
---

`startFlow` now types each step by the package passed as `code`, so settings,
mapping rule settings and `env` keys autocomplete and an unknown setting is a
type error; steps without typed code stay as loose as before. The Storybook
addon no longer passes a `session` setting the browser source never had.

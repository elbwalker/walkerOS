---
'@walkeros/core': patch
'@walkeros/web-source-session': patch
---

Expand `getMarketingParameters` to recognise 25+ ad platform click IDs
(Pinterest, Reddit, Quora, Yandex, Outbrain, Taboola, Mailchimp, Klaviyo,
HubSpot, Adobe, Impact, CJ, Branch, plus Google's `wbraid`/`gbraid`). Add a new
`platform` field that resolves the click ID to a canonical platform identifier
(e.g. `gclid` → `google`, `fbclid` → `meta`). Multi-click-ID URLs are resolved
deterministically via a priority order.

Custom click-ID registries can be passed as the third argument to
`getMarketingParameters`, or via the new `clickIds` field in the session source
settings — so flow.json users can extend or override defaults without touching
code.

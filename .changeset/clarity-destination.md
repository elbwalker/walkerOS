---
'@walkeros/web-destination-clarity': minor
---

Add Microsoft Clarity web destination (`@walkeros/web-destination-clarity`) —
session replay, heatmaps, custom tags, identity, session priority, and consent
translation via the official `@microsoft/clarity` SDK.

- Default event forwarding: every walkerOS event becomes `Clarity.event(name)`
- Custom tags: flatten sections with `settings.include` or define explicit maps
  with `mapping.settings.set`
- Identity: mapping values resolve to positional `Clarity.identify(...)` args
- Session priority: `mapping.settings.upgrade` fires `Clarity.upgrade(reason)`
- Consent: explicit `settings.consent` table translates walkerOS consent keys to
  Clarity `ConsentV2` categories (`analytics_Storage`, `ad_Storage`); full
  revocation also calls legacy `Clarity.consent(false)`
- Honours `mapping.skip` to run side effects without the default event call

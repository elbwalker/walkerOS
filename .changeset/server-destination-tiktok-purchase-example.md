---
'@walkeros/server-destination-tiktok': patch
---

The purchase step example sends TikTok's `Purchase` event instead of
`CompletePayment`, and the suggested standard event names follow TikTok's
current list (`Purchase` added; `ClickButton`, `CompletePayment` and
`PlaceAnOrder` removed). Any other name is still accepted. The `partner_name`
description names its default, `walkerOS`.

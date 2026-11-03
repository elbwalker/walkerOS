---
'@walkeros/web-destination-tiktok': patch
---

The `identify` setting and the `Settings` type say how Advanced Matching values
travel: the destination passes them to `ttq.identify()` unhashed, and TikTok
states that its Pixel hashes email and phone number. `auto_config` and
`limited_data_use` no longer state a TikTok default. The `StandardEventNames`
type suggests `Purchase` instead of `CompletePayment`, `PlaceAnOrder` and
`ClickButton`, and links TikTok's list.

---
'@walkeros/server-destination-bing': patch
---

The Bing step examples now send the visitor's anonymous ID in `userData`, as
Microsoft requires an identifier in every event, and the purchase example no
longer sends the raw user ID as `externalId`. The `user_data` description names
Microsoft's keys and says that only `em` and `ph` are hashed; the `url`
description says the custom URL must end in `/`.

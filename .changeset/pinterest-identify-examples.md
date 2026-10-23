---
'@walkeros/web-destination-pinterest': patch
---

The `identify` description matches the destination: init calls
`pintrk('load', tagId)` without an identity, which is sent with
`pintrk('set', ...)` when it changes, and the tag takes a plain or hashed email.
The checkout example's condition works as published, and the commerce examples
send product fields inside `line_items`, with `product_name` taken from the
product name.

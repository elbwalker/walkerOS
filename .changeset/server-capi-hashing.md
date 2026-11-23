---
'@walkeros/core': patch
'@walkeros/server-core': patch
'@walkeros/server-destination-meta': patch
'@walkeros/server-destination-bing': patch
'@walkeros/server-destination-pinterest': patch
'@walkeros/server-destination-snapchat': patch
'@walkeros/server-destination-twitter': patch
'@walkeros/server-destination-linkedin': patch
'@walkeros/server-destination-criteo': patch
---

The Meta, Bing, Pinterest, Snapchat, X, LinkedIn and Criteo server destinations
leave out an empty value under a key they hash, so an X event whose only primary
identifier is a blank email or phone, or a LinkedIn event whose only one is a
blank email, now fails with `missing-input`. Snapchat hashes a list item by
item, and a list under a key that takes one value (Bing `em` and `ph`, Snapchat
`external_id`, X `email` and `phone`, LinkedIn and Criteo `email`) is left out
with an ERROR line. `doNotHash` takes values that are already SHA-256 digests
and sends them as mapped, validation refuses a key the destination does not
hash, and Criteo no longer detects digests: use `doNotHash: ['email']` for a
SHA-256 digest (sent without the `md5` and `sha256_md5` keys) and map the raw
email instead of an MD5 digest.

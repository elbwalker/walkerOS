---
'@walkeros/server-destination-aws': patch
---

The Firehose step examples now state their expected record bytes as literals
instead of computing them with the destination's own encoder, so the examples
check the delivered record rather than agree with the code by construction.
Published behavior is unchanged.

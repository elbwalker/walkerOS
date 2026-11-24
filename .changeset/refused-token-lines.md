---
'@walkeros/server-core': patch
'@walkeros/cli': patch
---

A refused service credential's line now says only what is known. When the auth
server refuses the credential, the line names its end (replaced, revoked or
ended) and, for a self-hosted runner, that it is paired again on its Self-hosted
tab, and an earlier refusal never hides that line. When the app refuses a token
the auth server had just issued, the line names the resource the credential's
tokens are for and no end. The note on how far this clock is off shows only past
what the refusing check allows.

---
'@walkeros/server-core': patch
'@walkeros/cli': patch
---

A refused service credential's line now says only what is known. When the auth
server refuses the credential, the line names its end (replaced, revoked or
ended) and, for a self-hosted runner, that it is paired again on its Self-hosted
tab. When the app refuses a token the auth server had just issued, the line
names the resource the credential's tokens are for and no end, and the note on
how far this clock is off shows only past what the auth server allows.

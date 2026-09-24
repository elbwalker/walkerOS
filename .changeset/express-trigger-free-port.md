---
'@walkeros/server-source-express': patch
---

The express source's `createTrigger` now starts the triggered source on a free
port when its settings name no `port`, so simulating or testing an express
source flow no longer needs a port setting. A configured port and every other
source stay as given.

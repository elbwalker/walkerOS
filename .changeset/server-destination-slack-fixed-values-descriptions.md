---
'@walkeros/server-destination-slack': patch
---

The `threadTs` and `user` descriptions say that both are fixed values, not read
from the event, and `retryConfig` describes each policy and that retries go on
after the destination timeout has failed the push. Step example descriptions
name the fixed values and settings they use, and the examples' events carry
millisecond timestamps.

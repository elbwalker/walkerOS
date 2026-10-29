---
'@walkeros/server-source-fetch': patch
---

The pixel GET example now sends `name` and `data[...]` query parameters, the
form the source turns into an event. The previous example used `e` and `d`
parameters, which the collector rejects as an event without a name, so the
request answered with the GIF and nothing was delivered.

---
'@walkeros/server-source-express': minor
'@walkeros/core': minor
---

The Express source's `async` option now resolves per HTTP method: a boolean
still applies to the whole source, and a record like `{ "GET": true }` or
`{ "POST": false }` overrides one method while the other keeps its default. The
default changed: GET is now synchronous, so a step such as the file transformer
or a cache can serve real content instead of the tracking GIF, while POST keeps
the fast respond-first acknowledgement. To restore respond-first GET set
`async: true` or `async: { "GET": true }`; configs that set `async: false` only
to fix asset serving can drop it.

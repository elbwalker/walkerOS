---
'@walkeros/web-source-datalayer': patch
---

The dataLayer source now stamps every event it captures with its own identity,
so events arrive carrying `source.type: 'dataLayer'` and
`source.platform: 'web'` instead of defaulting to the collector. Destinations
that echo events back into the dataLayer can now guard against feedback loops,
and mappings can tell dataLayer-captured events apart.

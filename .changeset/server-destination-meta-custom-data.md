---
'@walkeros/server-destination-meta': patch
---

The Conversions API examples map value, currency, order id and contents into
`custom_data`, where Meta reads them; the old purchase example put them at the
top level of the server event, so check mappings copied from it. The examples
also send the client IP, user agent and a hashed external id, which website
events need.

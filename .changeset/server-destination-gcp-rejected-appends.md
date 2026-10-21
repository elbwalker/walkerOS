---
'@walkeros/server-destination-gcp': patch
---

An append that the BigQuery server rejects (quota, permission, a dropped table)
now fails the push instead of counting as delivered. Pub/Sub retries only the
error codes its SDK retries.

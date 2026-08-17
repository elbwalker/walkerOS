---
'@walkeros/collector': minor
---

Every event now gets its span id at entry, so all of its records carry the same
id and its journey is whole from the first hop. Batched deliveries report per
entry: each event in a batch gets its own flush or error frame, so an event in a
failed batch is never reported as delivered. Those frames emit when the batch
settles rather than when the flush starts.

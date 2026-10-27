---
'@walkeros/server-destination-kafka': patch
---

The Kafka settings descriptions match what the destination does: `sasl` no
longer names AWS MSK IAM, the `aws` fields belong to kafkajs's own AWS mechanism
and `authorizationIdentity` is required for it, `oauthbearer` cannot
authenticate without a token provider, and snappy, lz4 and zstd need a codec
registered in kafkajs. The step examples carry event timestamps in milliseconds.

---
'@walkeros/server-destination-kafka': minor
---

Add server-side Apache Kafka destination via kafkajs. Supports JSON
serialization, configurable compression (gzip, snappy, lz4, zstd), per-rule
topic and message key overrides, SASL/SSL authentication (Confluent Cloud, AWS
MSK, SCRAM, OAuthBearer), and graceful producer shutdown via destroy().

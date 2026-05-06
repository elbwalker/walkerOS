---
'@walkeros/server-destination-kafka': patch
---

Adopt the setup lifecycle for one-shot Kafka topic provisioning. Operators can
now run `walkeros setup destination.<id>` to create topics idempotently with
explicit `numPartitions`, `replicationFactor`, and `configEntries`. Drift on
partition count, replication factor, and config entries emits warnings without
auto-mutating. Optional Confluent Schema Registry binding registers a schema and
(optionally) sets the per-subject compatibility level.

**No safe defaults.** Kafka topic creation requires cluster-specific decisions.
The boolean form `setup: true` is rejected with an error listing the required
fields. Only the object form
(`setup: { numPartitions, replicationFactor, ... }`) is valid. This is the
canonical example of the "no safe default" pattern in the walkerOS
create-destination skill.

When the topic is missing at runtime, `push()` now logs an actionable error
pointing at `walkeros setup destination.<id>`.

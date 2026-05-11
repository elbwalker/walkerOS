# @walkeros/server-destination-kafka

Apache Kafka server destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Forwards events to Kafka
topics via [kafkajs](https://kafka.js.org/) with JSON serialization and
configurable compression.

## Installation

```bash
npm install @walkeros/server-destination-kafka
```

## Quick Start

```json
{
  "destinations": {
    "kafka": {
      "package": "@walkeros/server-destination-kafka",
      "config": {
        "settings": {
          "kafka": {
            "brokers": ["kafka1:9092", "kafka2:9092"],
            "topic": "walkeros-events"
          }
        }
      }
    }
  }
}
```

## Settings

| Setting                  | Type             | Required | Default      | Description                                                  |
| ------------------------ | ---------------- | -------- | ------------ | ------------------------------------------------------------ |
| `brokers`                | string[]         | Yes      | --           | Kafka broker addresses (host:port)                           |
| `topic`                  | string           | Yes      | --           | Target Kafka topic                                           |
| `clientId`               | string           | No       | `'walkeros'` | Kafka client identifier                                      |
| `ssl`                    | boolean / object | No       | --           | TLS config (`true` for default TLS)                          |
| `sasl`                   | object           | No       | --           | SASL auth (plain, scram, aws, oauthbearer)                   |
| `acks`                   | number           | No       | `-1`         | `-1` all replicas, `0` fire-and-forget, `1` leader           |
| `compression`            | string           | No       | `'gzip'`     | `none`, `gzip`, `snappy`, `lz4`, `zstd`                      |
| `key`                    | string           | No       | event name   | Mapping path for message key derivation                      |
| `headers`                | Record           | No       | --           | Static headers on every message                              |
| `idempotent`             | boolean          | No       | `false`      | Exactly-once delivery                                        |
| `allowAutoTopicCreation` | boolean          | No       | `false`      | Auto-create topics                                           |
| `retry`                  | object           | No       | --           | Retry config (`retries`, `maxRetryTime`, `initialRetryTime`) |

## Per-rule mapping settings

| Setting | Description                                                       |
| ------- | ----------------------------------------------------------------- |
| `key`   | Override message key mapping path for this rule                   |
| `topic` | Route this rule to a different topic than the destination default |

## Setup

Provisioning a Kafka topic requires explicit decisions. There is no safe default
for `numPartitions` or `replicationFactor`. Both are cluster-specific
operational choices that depend on broker count, expected throughput, and
consumer parallelism. A `replicationFactor` of 3 fails on a one-broker cluster;
a `replicationFactor` of 1 silently degrades durability on every healthy
production cluster. A `numPartitions` of 1 caps consumer throughput at a single
thread.

### Object form is the only valid form

The boolean form `setup: true` is rejected at runtime:

```text
Error: kafka destination setup requires explicit options:
{ topic, numPartitions, replicationFactor }. There is no safe default for
partition count or replication factor, these depend on your cluster topology.
```

### Required fields

- `numPartitions` (number)
- `replicationFactor` (number)
- `topic` (string), falls back to `settings.kafka.topic` when omitted

### Optional fields

- `configEntries`: topic-level config entries, e.g.
  `{ "retention.ms": "604800000" }`
- `schemaRegistry`: Confluent Schema Registry binding (see below)
- `validateOnly`: kafkajs broker-side dry-run, no topic is created

### Example

```json
{
  "destinations": {
    "kafka": {
      "package": "@walkeros/server-destination-kafka",
      "config": {
        "settings": {
          "kafka": { "brokers": ["broker:9092"], "topic": "walkeros-events" }
        },
        "setup": {
          "numPartitions": 6,
          "replicationFactor": 3,
          "configEntries": { "retention.ms": "604800000" }
        }
      }
    }
  }
}
```

Run `walkeros setup destination.kafka` to provision the topic. The command is
idempotent: re-running it against an existing topic is a safe no-op. Drift on
`numPartitions`, `replicationFactor`, or `configEntries` is logged as a WARN
without auto-mutating the broker. Operators decide whether to recreate the topic
or accept the drift.

### Schema Registry (optional)

```json
{
  "setup": {
    "numPartitions": 6,
    "replicationFactor": 3,
    "schemaRegistry": {
      "url": "https://schema-registry.example.com",
      "subject": "walkeros-events-value",
      "schemaType": "JSON",
      "schema": "{ \"type\": \"object\", \"properties\": { \"event\": { \"type\": \"string\" } } }",
      "compatibility": "BACKWARD"
    }
  }
}
```

The schema is registered via the Confluent Schema Registry REST API. The
optional `compatibility` level is set on the subject after registration.

### Runtime error when topic missing

When `setup` was not run and the topic does not exist on the cluster, `push()`
catches the kafkajs `UNKNOWN_TOPIC_OR_PARTITION` error and logs an actionable
message:

```text
Kafka topic "walkeros-events" not found on cluster broker:9092. Run
"walkeros setup destination.kafka" with explicit
{ numPartitions, replicationFactor } to create it.
```

## Authentication

### Confluent Cloud

```json
{
  "kafka": {
    "brokers": ["pkc-xxxxx.us-east-1.aws.confluent.cloud:9092"],
    "topic": "walkeros-events",
    "ssl": true,
    "sasl": {
      "mechanism": "plain",
      "username": "$env.CONFLUENT_API_KEY",
      "password": "$env.CONFLUENT_API_SECRET"
    }
  }
}
```

### AWS MSK (IAM)

```json
{
  "kafka": {
    "brokers": ["broker.msk.us-east-1.amazonaws.com:9098"],
    "topic": "walkeros-events",
    "ssl": true,
    "sasl": {
      "mechanism": "aws",
      "accessKeyId": "$env.AWS_ACCESS_KEY",
      "secretAccessKey": "$env.AWS_SECRET_KEY"
    }
  }
}
```

## Message format

Events are serialized as JSON. When a mapping transforms `data`, only the mapped
payload is sent; otherwise the full walkerOS event is sent. The message key
defaults to the event name (spaces replaced with `_`) for partition-based
ordering. Configure `key` (destination-level) or `mapping.settings.key`
(per-rule) to use any event property path.

## Shutdown

The destination implements `destroy()` calling `producer.disconnect()` to close
persistent TCP connections on flow hot-swap or server shutdown.

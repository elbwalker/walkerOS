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

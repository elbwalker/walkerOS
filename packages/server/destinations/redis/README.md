# @walkeros/server-destination-redis

Server-side Redis Streams destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Appends events to a Redis
Stream via `ioredis` XADD, with optional MAXLEN trimming, JSON or flat
serialization, and graceful shutdown.

## Installation

```bash
npm install @walkeros/server-destination-redis
```

## Quick Start

```json
{
  "destinations": {
    "redis": {
      "package": "@walkeros/server-destination-redis",
      "config": {
        "settings": {
          "redis": {
            "streamKey": "walkeros:events",
            "url": "redis://localhost:6379"
          }
        }
      }
    }
  }
}
```

## Settings

| Setting               | Type                 | Required | Default  | Description                                                     |
| --------------------- | -------------------- | -------- | -------- | --------------------------------------------------------------- |
| `redis.streamKey`     | `string`             | Yes      | --       | Redis stream key name                                           |
| `redis.url`           | `string`             | No       | --       | Redis connection URL (`redis://` or `rediss://`)                |
| `redis.options`       | `RedisClientOptions` | No       | --       | ioredis connection options (host, port, password, db, tls, ...) |
| `redis.maxLen`        | `number`             | No       | --       | Max stream length (approximate MAXLEN trimming)                 |
| `redis.exactTrimming` | `boolean`            | No       | `false`  | Use exact MAXLEN instead of approximate                         |
| `redis.serialization` | `'json' \| 'flat'`   | No       | `'json'` | Event serialization mode                                        |

## Per-rule mapping overrides

| Setting                      | Type     | Description                       |
| ---------------------------- | -------- | --------------------------------- |
| `mapping.settings.streamKey` | `string` | Override stream key for this rule |

## Serialization Modes

- **`json`** (default): Stores the full event as a single `event` field with a
  JSON string value. Preserves nested structure, easy to deserialize downstream.
- **`flat`**: Stores top-level event fields as separate stream entry fields.
  Nested objects are JSON-encoded. Useful for XREAD filtering on specific
  fields.

## Shutdown

The destination calls `quit()` on the Redis client during `destroy()`, ensuring
all in-flight XADD commands complete. User-provided clients are not closed.

## Providers

Works with any Redis 5.0+ server supporting Streams: Redis Cloud, Upstash,
ElastiCache, MemoryDB, Azure Cache, Memorystore, self-hosted.

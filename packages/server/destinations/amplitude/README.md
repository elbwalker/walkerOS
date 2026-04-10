# @walkeros/server-destination-amplitude

Server-side Amplitude destination for walkerOS. Sends events to Amplitude via
the `@amplitude/analytics-node` SDK with per-event identity, revenue, groups,
eventOptions, and consent support.

## Installation

```bash
npm install @walkeros/server-destination-amplitude
```

## Quick Start

Minimal `flow.json` configuration:

```json
{
  "destinations": {
    "amplitude": {
      "package": "@walkeros/server-destination-amplitude",
      "config": {
        "settings": {
          "apiKey": "YOUR_AMPLITUDE_API_KEY"
        }
      }
    }
  }
}
```

## Settings

| Setting                        | Type             | Required | Default | Description                             |
| ------------------------------ | ---------------- | -------- | ------- | --------------------------------------- |
| `apiKey`                       | string           | Yes      | -       | Amplitude project API key               |
| `serverZone`                   | `'US'` \| `'EU'` | No       | `'US'`  | Data residency zone                     |
| `useBatch`                     | boolean          | No       | `false` | Use batch endpoint (higher rate limits) |
| `flushIntervalMillis`          | number           | No       | `10000` | Flush interval in ms                    |
| `flushQueueSize`               | number           | No       | `200`   | Max queued events before flush          |
| `flushMaxRetries`              | number           | No       | `12`    | Max retries on failed flush             |
| `minIdLength`                  | number           | No       | -       | Minimum length for user_id/device_id    |
| `serverUrl`                    | string           | No       | -       | Custom server URL for proxies           |
| `optOut`                       | boolean          | No       | `false` | Initial opt-out state                   |
| `enableRequestBodyCompression` | boolean          | No       | `false` | Enable gzip compression                 |
| `identify`                     | MappingValue     | No       | -       | Per-event identity resolution           |
| `eventOptions`                 | MappingValue     | No       | -       | Per-event EventOptions                  |
| `include`                      | string[]         | No       | -       | Event sections as event_properties      |

## Identity (Per-Event EventOptions)

Unlike the browser SDK, the Node SDK has no stateful `setUserId()` or
`setDeviceId()`. Identity is passed per-event via `EventOptions` on every SDK
call.

```json
{
  "settings": {
    "identify": {
      "map": {
        "user_id": "user.id",
        "device_id": "user.device",
        "session_id": "user.session"
      }
    }
  }
}
```

### Identify Operations (User Properties)

Use per-rule mapping to set, increment, or clear user properties:

```json
{
  "mapping": {
    "user": {
      "login": {
        "skip": true,
        "settings": {
          "identify": {
            "map": {
              "user_id": "data.user_id",
              "set": {
                "map": {
                  "plan": "data.plan",
                  "company": "data.company"
                }
              },
              "setOnce": {
                "map": { "first_login": "timestamp" }
              },
              "add": {
                "map": { "login_count": { "value": 1 } }
              }
            }
          }
        }
      }
    }
  }
}
```

Supported identify operations: `set`, `setOnce`, `add`, `append`, `prepend`,
`preInsert`, `postInsert`, `remove`, `unset`, `clearAll`.

## Revenue

### Single Product

```json
{
  "mapping": {
    "subscription": {
      "renew": {
        "skip": true,
        "settings": {
          "revenue": {
            "map": {
              "productId": "data.plan_id",
              "price": "data.amount",
              "revenueType": { "value": "renewal" },
              "currency": { "key": "data.currency", "value": "USD" }
            }
          }
        }
      }
    }
  }
}
```

### Multi-Product (Loop)

```json
{
  "settings": {
    "revenue": {
      "loop": [
        "nested",
        {
          "map": {
            "productId": "data.id",
            "price": "data.price",
            "quantity": { "key": "data.quantity", "value": 1 },
            "revenueType": { "value": "purchase" }
          }
        }
      ]
    }
  }
}
```

Revenue fields: `productId`, `price`, `quantity`, `revenueType`, `currency`,
`revenue`, `receipt`, `receiptSig`, `eventProperties`.

## Groups

```json
{
  "settings": {
    "group": {
      "map": {
        "type": { "value": "company" },
        "name": "data.company"
      }
    },
    "groupIdentify": {
      "map": {
        "type": { "value": "company" },
        "name": "data.company",
        "set": {
          "map": {
            "industry": "data.industry",
            "size": "data.employee_count"
          }
        }
      }
    }
  }
}
```

## EventOptions (time, insert_id, ip)

Server-specific fields for offline/delayed events and deduplication:

```json
{
  "settings": {
    "eventOptions": {
      "map": {
        "time": "timestamp",
        "insert_id": "id",
        "ip": "context.ip"
      }
    }
  }
}
```

## Consent

Declare required consent in `config.consent`. The destination toggles
`amplitude.setOptOut()` when consent state changes.

```json
{
  "config": {
    "consent": { "analytics": true },
    "settings": { "apiKey": "..." }
  }
}
```

## Destroy / Flush

The destination calls `amplitude.flush()` on destroy to ensure all buffered
events are sent before the process exits. This is critical for graceful server
shutdown and short-lived processes.

## Mapping Settings

Per-rule mapping settings override destination-level settings:

| Setting         | Type         | Description                                      |
| --------------- | ------------ | ------------------------------------------------ |
| `identify`      | MappingValue | Per-event identity (overrides destination-level) |
| `revenue`       | MappingValue | Revenue data (single or loop)                    |
| `group`         | MappingValue | Group assignment `{ type, name }`                |
| `groupIdentify` | MappingValue | Group properties                                 |
| `eventOptions`  | MappingValue | Per-rule EventOptions override                   |
| `include`       | string[]     | Per-rule include (replaces destination-level)    |

## SDK Call Mapping

| walkerOS                  | Amplitude SDK Call                                            |
| ------------------------- | ------------------------------------------------------------- |
| Event push                | `amplitude.track(eventType, props, eventOptions)`             |
| `settings.identify` (ops) | `amplitude.identify(Identify, eventOptions)`                  |
| `settings.revenue`        | `amplitude.revenue(Revenue, eventOptions)`                    |
| `settings.group`          | `amplitude.setGroup(type, name, eventOptions)`                |
| `settings.groupIdentify`  | `amplitude.groupIdentify(type, name, Identify, eventOptions)` |
| Consent revoked           | `amplitude.setOptOut(true)`                                   |
| Consent granted           | `amplitude.setOptOut(false)`                                  |
| Destroy                   | `amplitude.flush()`                                           |

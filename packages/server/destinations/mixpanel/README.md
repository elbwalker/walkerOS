# @walkeros/server-destination-mixpanel

Server-side Mixpanel destination for walkerOS. Forwards events via the
`mixpanel` Node.js SDK, supporting track, import, people operations, group
analytics, and identity mapping.

## Installation

```bash
npm install @walkeros/server-destination-mixpanel
```

## Minimal Config

```json
{
  "destinations": {
    "mixpanel": {
      "package": "@walkeros/server-destination-mixpanel",
      "config": {
        "settings": {
          "apiKey": "$env:MIXPANEL_TOKEN"
        }
      }
    }
  }
}
```

## Settings

| Setting     | Type     | Required | Default            | Description                                         |
| ----------- | -------- | -------- | ------------------ | --------------------------------------------------- |
| `apiKey`    | string   | Yes      | -                  | Mixpanel project token                              |
| `secret`    | string   | No       | -                  | API secret for /import endpoint                     |
| `host`      | string   | No       | `api.mixpanel.com` | API host (EU: `api-eu.mixpanel.com`)                |
| `protocol`  | string   | No       | `https`            | Request protocol                                    |
| `keepAlive` | boolean  | No       | `true`             | Reuse HTTP connections                              |
| `geolocate` | boolean  | No       | `false`            | Parse IP for geolocation                            |
| `debug`     | boolean  | No       | `false`            | Enable SDK debug logging                            |
| `verbose`   | boolean  | No       | `false`            | Enable verbose request logging                      |
| `test`      | boolean  | No       | `false`            | Dry-run mode                                        |
| `useImport` | boolean  | No       | `false`            | Use /import instead of /track                       |
| `identify`  | mapping  | No       | -                  | Identity mapping resolving `{ distinctId, alias? }` |
| `include`   | string[] | No       | -                  | Event sections to flatten into properties           |
| `group`     | mapping  | No       | -                  | Group association resolving `{ key, id }`           |

## Mapping Settings

Per-event settings configured in `mapping.<entity>.<action>.settings`:

| Key            | Description                                     |
| -------------- | ----------------------------------------------- |
| `identify`     | Override destination-level identity             |
| `people`       | People profile operations (set, set_once, etc.) |
| `group`        | Group association for this event                |
| `groupProfile` | Group profile operations (set, set_once, etc.)  |
| `useImport`    | Use /import for this event                      |

## Track vs Import

By default, events are sent via `/track` (real-time, last 5 days only). Set
`useImport: true` for historical data (any age, requires `secret`):

```json
{
  "settings": {
    "apiKey": "$env:MIXPANEL_TOKEN",
    "secret": "$env:MIXPANEL_API_SECRET",
    "useImport": true
  }
}
```

## People Operations

```json
{
  "mapping": {
    "user": {
      "login": {
        "silent": true,
        "settings": {
          "identify": { "map": { "distinctId": "data.user_id" } },
          "people": {
            "map": {
              "set": { "map": { "email": "data.email", "plan": "data.plan" } },
              "set_once": { "map": { "first_login": "timestamp" } },
              "increment": { "map": { "login_count": { "value": 1 } } }
            }
          }
        }
      }
    }
  }
}
```

Supported operations: `set`, `set_once`, `increment`, `append`, `union`,
`remove`, `unset`, `delete_user`.

## Group Analytics

Attach group to events:

```json
{
  "settings": {
    "group": {
      "map": {
        "key": { "value": "company_id" },
        "id": "data.company_id"
      }
    }
  }
}
```

Update group profiles:

```json
{
  "mapping": {
    "company": {
      "update": {
        "silent": true,
        "settings": {
          "groupProfile": {
            "map": {
              "key": { "value": "company_id" },
              "id": "data.company_id",
              "set": {
                "map": {
                  "name": "data.company_name",
                  "plan": "data.plan"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

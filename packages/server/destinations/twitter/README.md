# @walkeros/server-destination-twitter

X (Twitter) Conversions API (CAPI) server destination for walkerOS. Streams
conversion events to X via server-to-server HTTPS POST, authenticated with OAuth
1.0a.

## Installation

```bash
npm install @walkeros/server-destination-twitter
```

## Prerequisites

- X Developer account with **Ads API access**
- Project with **AD_MANAGER** or **ACCOUNT_ADMIN** role
- Pre-registered conversion events in **Ads Manager** (provides the `eventId` in
  `tw-xxxxx-xxxxx` format)
- OAuth 1.0a credentials (Consumer Key/Secret + Access Token/Secret)

## Minimal Config

```json
{
  "destinations": {
    "twitter": {
      "package": "@walkeros/server-destination-twitter",
      "config": {
        "consent": { "marketing": true },
        "settings": {
          "pixelId": "o8z6j",
          "eventId": "tw-o8z6j-o8z21",
          "consumerKey": "$env:TWITTER_CONSUMER_KEY",
          "consumerSecret": "$env:TWITTER_CONSUMER_SECRET",
          "accessToken": "$env:TWITTER_ACCESS_TOKEN",
          "accessTokenSecret": "$env:TWITTER_ACCESS_TOKEN_SECRET"
        }
      }
    }
  }
}
```

## Full Config

```json
{
  "destinations": {
    "twitter": {
      "package": "@walkeros/server-destination-twitter",
      "config": {
        "consent": { "marketing": true },
        "settings": {
          "pixelId": "o8z6j",
          "eventId": "tw-o8z6j-o8z21",
          "consumerKey": "$env:TWITTER_CONSUMER_KEY",
          "consumerSecret": "$env:TWITTER_CONSUMER_SECRET",
          "accessToken": "$env:TWITTER_ACCESS_TOKEN",
          "accessTokenSecret": "$env:TWITTER_ACCESS_TOKEN_SECRET",
          "apiVersion": "12",
          "user_data": {
            "email": "user.email",
            "phone": "user.phone",
            "twclid": "context.twclid",
            "ip_address": "context.ip",
            "user_agent": "context.userAgent"
          }
        },
        "mapping": {
          "order": {
            "complete": {
              "settings": {
                "value": "data.total",
                "currency": { "key": "data.currency", "value": "USD" },
                "number_items": "data.count"
              }
            }
          },
          "form": { "submit": {} }
        }
      }
    }
  }
}
```

## Settings

| Setting             | Type     | Required | Default                    | Description                                |
| ------------------- | -------- | -------- | -------------------------- | ------------------------------------------ |
| `pixelId`           | string   | yes      | -                          | X Pixel ID in the endpoint URL             |
| `eventId`           | string   | yes      | -                          | Default conversion event ID (`tw-xxx-xxx`) |
| `consumerKey`       | string   | yes      | -                          | OAuth 1.0a API Key                         |
| `consumerSecret`    | string   | yes      | -                          | OAuth 1.0a API Key Secret                  |
| `accessToken`       | string   | yes      | -                          | OAuth 1.0a User Access Token               |
| `accessTokenSecret` | string   | yes      | -                          | OAuth 1.0a User Access Token Secret        |
| `apiVersion`        | string   | no       | `"12"`                     | X Ads API version number                   |
| `doNotHash`         | string[] | no       | `[]`                       | User data fields already hashed upstream   |
| `url`               | string   | no       | `"https://ads-api.x.com/"` | API base URL override (for testing)        |
| `user_data`         | object   | no       | -                          | Mapping config for user identifiers        |

## Mapping Settings

Per-event overrides via `mapping.settings`:

| Field          | Type          | Description                                         |
| -------------- | ------------- | --------------------------------------------------- |
| `eventId`      | string        | Override the default conversion `eventId` per event |
| `value`        | string/number | Conversion monetary value (sent as a string to X)   |
| `currency`     | string        | ISO 4217 currency code                              |
| `number_items` | number        | Integer number of items in the conversion           |
| `description`  | string        | Free-text description of the conversion             |

## User Identification

The destination builds an `identifiers` array. Each identifier is a separate
single-key object in the payload.

Primary identifiers (at least one required):

- **`hashed_email`** -- from `event.user.email` or `user_data.email`, SHA-256
  hashed (trimmed + lowercased).
- **`hashed_phone_number`** -- from `event.user.phone` or `user_data.phone`,
  SHA-256 hashed.
- **`twclid`** -- X click ID (pass-through, **not** hashed). Typically forwarded
  from the browser via `context.twclid`.

Secondary identifiers (optional):

- **`ip_address`** -- client IP, pass-through.
- **`user_agent`** -- user agent string, pass-through.

Use `doNotHash: ['email']` or `doNotHash: ['phone']` to skip hashing for values
that are already SHA-256 hashed upstream.

Events without any primary identifier are silently skipped.

## Deduplication

The walkerOS event `id` is sent as `conversion_id`. When paired with the
browser-side X (Twitter) Pixel, use the same ID on both sides so X can
deduplicate duplicate conversions across web and server signals.

## Multi-Event Setup

Use a single destination with per-event `eventId` overrides:

```json
{
  "destinations": {
    "twitter": {
      "package": "@walkeros/server-destination-twitter",
      "config": {
        "settings": {
          "pixelId": "o8z6j",
          "eventId": "tw-o8z6j-default-001",
          "consumerKey": "$env:TWITTER_CONSUMER_KEY",
          "consumerSecret": "$env:TWITTER_CONSUMER_SECRET",
          "accessToken": "$env:TWITTER_ACCESS_TOKEN",
          "accessTokenSecret": "$env:TWITTER_ACCESS_TOKEN_SECRET"
        },
        "mapping": {
          "order": {
            "complete": {
              "settings": {
                "eventId": { "value": "tw-o8z6j-purchase-01" },
                "value": "data.total",
                "currency": { "key": "data.currency", "value": "USD" }
              }
            }
          },
          "form": {
            "submit": {
              "settings": {
                "eventId": { "value": "tw-o8z6j-lead-01" }
              }
            }
          }
        }
      }
    }
  }
}
```

## Consent

Marketing consent is required. Configure via `config.consent`:

```json
"consent": { "marketing": true }
```

## Links

- [X Conversions API docs](https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/conversions)
- [walkerOS documentation](https://www.walkeros.io/docs/destinations/server/twitter)

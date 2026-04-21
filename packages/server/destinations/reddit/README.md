# @walkeros/server-destination-reddit

Server-side Reddit Conversions API destination for walkerOS.

## Installation

```bash
npm install @walkeros/server-destination-reddit
```

## Configuration

```json
{
  "destinations": {
    "reddit": {
      "package": "@walkeros/server-destination-reddit",
      "config": {
        "settings": {
          "accessToken": "rdt_...",
          "pixelId": "a2_abcdef123456"
        }
      }
    }
  }
}
```

## Settings

| Setting         | Type     | Required | Default                                                   | Description                                          |
| --------------- | -------- | -------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `accessToken`   | string   | yes      | -                                                         | Reddit Conversion Access Token (Bearer auth)         |
| `pixelId`       | string   | yes      | -                                                         | Reddit Pixel ID (appended as API path)               |
| `action_source` | string   | no       | -                                                         | Event source: `WEBSITE`, `APP`, `PHYSICAL_STORE`     |
| `doNotHash`     | string[] | no       | -                                                         | User fields to skip hashing                          |
| `test_mode`     | boolean  | no       | `false`                                                   | Enable test mode (top-level boolean in request body) |
| `url`           | string   | no       | `https://ads-api.reddit.com/api/v2.0/conversions/events/` | Custom API base URL                                  |
| `user_data`     | object   | no       | -                                                         | Default user field mapping applied to all events     |

## Event Mapping

Reddit uses a rigid taxonomy. Map walkerOS events to a standard `tracking_type`:

| walkerOS Event     | Reddit tracking_type |
| ------------------ | -------------------- |
| `page view`        | `PageVisit`          |
| `product view`     | `ViewContent`        |
| `site search`      | `Search`             |
| `product add`      | `AddToCart`          |
| `product wishlist` | `AddToWishlist`      |
| `order complete`   | `Purchase`           |
| `form submit`      | `Lead`               |
| `user signup`      | `SignUp`             |

Any non-standard name becomes
`{ tracking_type: 'Custom', custom_event_name: '<name>' }` automatically.

## User Data

### Hashed Fields (SHA-256)

| Field       | Key           | Description                    |
| ----------- | ------------- | ------------------------------ |
| Email       | `email`       | Lowercase, trimmed             |
| External ID | `external_id` | Advertiser user identifier     |
| IP address  | `ip_address`  | Hashed (unlike Meta/Pinterest) |
| User agent  | `user_agent`  | Hashed (unlike Meta/Pinterest) |
| IDFA        | `idfa`        | iOS advertising identifier     |
| AAID        | `aaid`        | Android advertising identifier |

### Pass-through Fields (not hashed)

| Field             | Key                       |
| ----------------- | ------------------------- |
| UUID              | `uuid`                    |
| Opt-out           | `opt_out`                 |
| Screen dimensions | `screen_dimensions`       |
| Data processing   | `data_processing_options` |

Use `doNotHash` to skip hashing for pre-hashed values.

## event_metadata

Conversion details (value, currency, products, etc.) are nested under
`event_metadata` (Reddit's equivalent of Meta's `custom_data`). The destination
automatically sets `event_metadata.conversion_id` to `event.id` for
deduplication with the Reddit Pixel.

```json
{
  "data": {
    "map": {
      "event_metadata": {
        "map": {
          "value_decimal": "data.total",
          "currency": { "key": "data.currency", "value": "USD" },
          "item_count": { "value": 1 },
          "products": {
            "loop": [
              "nested",
              {
                "condition": { "$code": "e => e.entity === 'product'" },
                "map": {
                  "id": "data.id",
                  "name": "data.name",
                  "category": {
                    "key": "data.category",
                    "value": "uncategorized"
                  }
                }
              }
            ]
          }
        }
      }
    }
  }
}
```

## Deduplication

The destination automatically sets `event_metadata.conversion_id` to `event.id`.
When the Reddit Pixel is also in the browser, deduplication works automatically
because both sides share the same walkerOS `event.id`.

## Test Mode

Set `test_mode: true` in settings to send `"test_mode": true` in the request
body. This is a top-level boolean (not a query parameter). Events sent with
`test_mode` do not count toward ads delivery.

## Links

- [Reddit Conversions API documentation](https://ads-api.reddit.com/docs/v2/#tag/Conversions-API)
- [walkerOS documentation](https://www.walkeros.io/docs/destinations/server/reddit)

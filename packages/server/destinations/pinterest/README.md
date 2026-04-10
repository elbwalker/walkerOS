# @walkeros/server-destination-pinterest

Server-side Pinterest Conversions API destination for walkerOS.

## Installation

```bash
npm install @walkeros/server-destination-pinterest
```

## Configuration

```json
{
  "destinations": {
    "pinterest": {
      "package": "@walkeros/server-destination-pinterest",
      "config": {
        "settings": {
          "accessToken": "pina_...",
          "adAccountId": "123456789"
        }
      }
    }
  }
}
```

## Settings

| Setting         | Type     | Required | Default                         | Description                                              |
| --------------- | -------- | -------- | ------------------------------- | -------------------------------------------------------- |
| `accessToken`   | string   | yes      | -                               | Pinterest conversion access token (Bearer auth)          |
| `adAccountId`   | string   | yes      | -                               | Pinterest ad account ID (numeric string)                 |
| `action_source` | string   | no       | `"web"`                         | Event source: `web`, `app_android`, `app_ios`, `offline` |
| `doNotHash`     | string[] | no       | -                               | User data fields to skip hashing                         |
| `test`          | boolean  | no       | `false`                         | Enable test mode (`?test=true` query param)              |
| `url`           | string   | no       | `https://api.pinterest.com/v5/` | Custom API base URL                                      |
| `user_data`     | object   | no       | -                               | Default user_data mapping for all events                 |
| `partner_name`  | string   | no       | -                               | Third-party partner name for attribution                 |

## Event Mapping

| walkerOS Event   | Pinterest CAPI Event |
| ---------------- | -------------------- |
| `page view`      | `page_visit`         |
| `order complete` | `checkout`           |
| `product add`    | `add_to_cart`        |
| `product view`   | `view_content`       |
| `user signup`    | `signup`             |
| `site search`    | `search`             |
| `checkout start` | `initiate_checkout`  |
| `form submit`    | `lead`               |

## User Data

### Hashed Fields (SHA-256)

| Field         | Key            | Description                   |
| ------------- | -------------- | ----------------------------- |
| Email         | `em`           | Lowercase, trimmed            |
| Phone         | `ph`           | Digits only with country code |
| First name    | `fn`           | Lowercase                     |
| Last name     | `ln`           | Lowercase                     |
| Date of birth | `db`           | YYYYMMDD format               |
| Gender        | `ge`           | Single letter: f, m, n        |
| City          | `ct`           | Lowercase, no spaces          |
| State         | `st`           | Two-letter code, lowercase    |
| Zip code      | `zp`           | Digits only                   |
| Country       | `country`      | ISO 3166-1 alpha-2, lowercase |
| External ID   | `external_id`  | Advertiser user identifier    |
| Mobile ad IDs | `hashed_maids` | GAID or IDFA                  |

### Pass-through Fields (not hashed)

| Field      | Key                 |
| ---------- | ------------------- |
| Client IP  | `client_ip_address` |
| User agent | `client_user_agent` |
| Click ID   | `click_id`          |
| Partner ID | `partner_id`        |

Use `doNotHash` to skip hashing for pre-hashed fields.

## Custom Data

Ecommerce data is nested under `custom_data`:

```json
{
  "data": {
    "map": {
      "custom_data": {
        "map": {
          "value": "data.total",
          "currency": { "key": "data.currency", "value": "USD" },
          "order_id": "data.id",
          "contents": {
            "loop": [
              "nested",
              {
                "condition": { "$code": "e => e.entity === 'product'" },
                "map": {
                  "id": "data.id",
                  "item_name": "data.name",
                  "item_price": "data.price",
                  "quantity": { "key": "data.quantity", "value": 1 }
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

The destination automatically sets `event_id` from `event.id`. When using both
the web Pinterest destination and this server destination, deduplication works
automatically since both receive the same walkerOS event with the same
`event.id`.

## Test Mode

Set `test: true` in settings to append `?test=true` to the API URL. Events will
appear in Pinterest Ads Manager under the test events section.

## Links

- [Pinterest Conversions API docs](https://developers.pinterest.com/docs/conversions/conversions/)
- [walkerOS documentation](https://www.walkeros.io/docs/destinations/server/pinterest-capi)

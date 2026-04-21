# @walkeros/server-destination-snapchat

Server-side Snapchat Conversions API destination for walkerOS. Sends conversion
events directly to Snapchat's Conversions API v3 via HTTP POST for reliable
server-to-server tracking.

## Installation

```bash
npm install @walkeros/server-destination-snapchat
```

## Quick Start

```json
{
  "destinations": {
    "snapchat": {
      "package": "@walkeros/server-destination-snapchat",
      "config": {
        "settings": {
          "pixelId": "YOUR_PIXEL_ID",
          "accessToken": "YOUR_ACCESS_TOKEN"
        },
        "mapping": {
          "order": {
            "complete": {
              "name": "PURCHASE",
              "data": {
                "map": {
                  "custom_data": {
                    "map": {
                      "value": "data.total",
                      "currency": "data.currency",
                      "transaction_id": "data.id"
                    }
                  }
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

## Settings

| Setting         | Type     | Required | Default                       | Description                                                 |
| --------------- | -------- | -------- | ----------------------------- | ----------------------------------------------------------- |
| `accessToken`   | string   | Yes      | --                            | Long-lived CAPI token from Snapchat Ads Manager             |
| `pixelId`       | string   | Yes      | --                            | Snap Pixel ID                                               |
| `url`           | string   | No       | `https://tr.snapchat.com/v3/` | Custom Conversions API base URL                             |
| `action_source` | string   | No       | `WEB`                         | One of `WEB`, `MOBILE_APP`, `OFFLINE`                       |
| `doNotHash`     | string[] | No       | `[]`                          | User data fields to skip SHA-256 hashing                    |
| `user_data`     | object   | No       | --                            | Default user data mapping (e.g. `{ em: 'user.email' }`)     |
| `testMode`      | boolean  | No       | `false`                       | Send to `/events/validate` for testing instead of `/events` |

## Event Mapping

| walkerOS Event     | Snapchat Standard Event (UPPERCASE) |
| ------------------ | ----------------------------------- |
| `page view`        | `PAGE_VIEW`                         |
| `product view`     | `VIEW_CONTENT`                      |
| `product add`      | `ADD_CART`                          |
| `wishlist add`     | `ADD_TO_WISHLIST`                   |
| `checkout start`   | `START_CHECKOUT`                    |
| `checkout payment` | `ADD_BILLING`                       |
| `order complete`   | `PURCHASE`                          |
| `form submit`      | `SIGN_UP`                           |
| `search submit`    | `SEARCH`                            |
| `subscribe submit` | `SUBSCRIBE`                         |
| `user login`       | `LOGIN`                             |

Set the Snapchat event name via the rule's `name` field. Use UPPERCASE for
standard events; custom event names may use `CUSTOM_EVENT_1..5` or any string.

## User Data & Hashing

The following 11 identity fields are automatically SHA-256 hashed before
sending. They match Meta's CAPI semantics:

| Field         | Hashed | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `em`          | Yes    | Email (lowercased, trimmed)                  |
| `ph`          | Yes    | Phone number (E.164 digits)                  |
| `fn`          | Yes    | First name (lowercase)                       |
| `ln`          | Yes    | Last name (lowercase)                        |
| `db`          | Yes    | Date of birth (YYYYMMDD)                     |
| `ge`          | Yes    | Gender (`m`, `f`)                            |
| `ct`          | Yes    | City (lowercase)                             |
| `st`          | Yes    | State (lowercase)                            |
| `zp`          | Yes    | Zip or postal code                           |
| `country`     | Yes    | Country code (ISO 3166-1 alpha-2, lowercase) |
| `external_id` | Yes    | External/customer identifier                 |

These user data fields are **never** hashed and pass through as-is:

| Field               | Hashed | Description                        |
| ------------------- | ------ | ---------------------------------- |
| `sc_cookie1`        | No     | Snap Pixel cookie                  |
| `client_ip_address` | No     | Client IP address (IPv4 or IPv6)   |
| `client_user_agent` | No     | Browser user agent string          |
| `sc_click_id`       | No     | Snap click ID                      |
| `idfv`              | No     | iOS IDFV                           |
| `madid`             | No     | Mobile advertiser ID (IDFA / AAID) |

Use the `doNotHash` setting to skip hashing for pre-hashed values.

## custom_data Structure

Properties must be nested under `custom_data` (unlike Meta's CAPI which puts
them flat on the event root). Map them via `data.map.custom_data.map`:

```json
{
  "data": {
    "map": {
      "custom_data": {
        "map": {
          "value": "data.total",
          "currency": "data.currency",
          "transaction_id": "data.id",
          "contents": {
            "loop": [
              "nested",
              {
                "map": {
                  "id": "data.id",
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

The destination uses `event.id` as Snapchat's `event_id`. When using both the
Snap Pixel client-side and this server destination, Snapchat deduplicates
matching events across channels within a 48h window by `event_id` +
`event_name`.

## Test Mode

Set `"testMode": true` in settings to send events to Snapchat's
`/events/validate` endpoint instead of `/events`. Snapchat returns detailed
validation feedback without counting the event toward ads delivery. Switch off
before going live.

## Links

- [Snapchat Conversions API Documentation](https://businesshelp.snapchat.com/s/article/conversions-api)
- [walkerOS Documentation](https://www.walkeros.io)

# @walkeros/server-destination-tiktok

Server-side TikTok Events API destination for walkerOS. Sends conversion events
directly to TikTok's Events API via HTTP POST for reliable server-to-server
tracking.

## Installation

```bash
npm install @walkeros/server-destination-tiktok
```

## Quick Start

```json
{
  "destinations": {
    "tiktok": {
      "package": "@walkeros/server-destination-tiktok",
      "config": {
        "settings": {
          "pixelCode": "YOUR_PIXEL_CODE",
          "accessToken": "YOUR_ACCESS_TOKEN"
        },
        "mapping": {
          "order": {
            "complete": {
              "name": "CompletePayment",
              "data": {
                "map": {
                  "value": "data.total",
                  "currency": "data.currency",
                  "order_id": "data.id"
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

| Setting           | Type     | Required | Default                                                      | Description                             |
| ----------------- | -------- | -------- | ------------------------------------------------------------ | --------------------------------------- |
| `pixelCode`       | string   | Yes      | --                                                           | TikTok Pixel Code from Events Manager   |
| `accessToken`     | string   | Yes      | --                                                           | Events API access token                 |
| `url`             | string   | No       | `https://business-api.tiktok.com/open_api/v1.3/event/track/` | Custom endpoint URL                     |
| `test_event_code` | string   | No       | --                                                           | Test event code for debugging           |
| `doNotHash`       | string[] | No       | `[]`                                                         | User data fields to skip SHA256 hashing |
| `user_data`       | object   | No       | --                                                           | Default user data mapping               |
| `partner_name`    | string   | No       | `walkerOS`                                                   | Partner name for TikTok attribution     |

## Event Mapping

| walkerOS Event     | TikTok Standard Event  |
| ------------------ | ---------------------- |
| `product view`     | `ViewContent`          |
| `product add`      | `AddToCart`            |
| `checkout start`   | `InitiateCheckout`     |
| `checkout payment` | `AddPaymentInfo`       |
| `order complete`   | `CompletePayment`      |
| `form submit`      | `SubmitForm`           |
| `user register`    | `CompleteRegistration` |
| `search submit`    | `Search`               |
| `contact submit`   | `Contact`              |

## User Data & Hashing

The following fields are automatically SHA256-hashed before sending:

| Field          | Hashed | Description                         |
| -------------- | ------ | ----------------------------------- |
| `email`        | Yes    | Email address (lowercased, trimmed) |
| `phone_number` | Yes    | Phone in E.164 format               |
| `external_id`  | Yes    | Custom user identifier              |
| `ttp`          | No     | TikTok `_ttp` cookie value          |
| `ttclid`       | No     | TikTok click ID                     |
| `locale`       | No     | Client locale                       |

Use the `doNotHash` setting to skip hashing for pre-hashed values.

## Deduplication

The destination uses `event.id` as TikTok's `event_id`. When using both the web
pixel (`@walkeros/web-destination-tiktok`) and this server destination, TikTok
deduplicates events by matching `event_id` + `event` name across both channels.

## Links

- [TikTok Events API Documentation](https://business-api.tiktok.com/portal/docs?id=1771100865818625)
- [walkerOS Documentation](https://www.walkeros.io)

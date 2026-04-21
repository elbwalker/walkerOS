# @walkeros/server-destination-criteo

Server-side Criteo Events API destination for walkerOS. Sends retargeting events
directly to Criteo's Events API (S2S v0) via HTTP POST for reliable
server-to-server tracking.

## Installation

```bash
npm install @walkeros/server-destination-criteo
```

## Quick Start

```json
{
  "destinations": {
    "criteo": {
      "package": "@walkeros/server-destination-criteo",
      "config": {
        "settings": {
          "partnerId": "YOUR_PARTNER_ID",
          "callerId": "YOUR_CALLER_ID"
        },
        "mapping": {
          "order": {
            "complete": {
              "name": "trackTransaction",
              "data": {
                "map": {
                  "id": "data.id",
                  "item": {
                    "loop": [
                      "nested",
                      {
                        "map": {
                          "id": "data.id",
                          "price": "data.price",
                          "quantity": "data.quantity"
                        }
                      }
                    ]
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

| Setting     | Type   | Required | Default                                            | Description                                                                            |
| ----------- | ------ | -------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `partnerId` | string | Yes      | --                                                 | Criteo Partner ID (numeric, provided by Criteo)                                        |
| `callerId`  | string | Yes      | --                                                 | Caller ID for user mapping (provided by Criteo)                                        |
| `siteType`  | string | No       | `d`                                                | One of `d` (desktop), `m` (mobile web), `t` (tablet)                                   |
| `country`   | string | No       | --                                                 | ISO 3166-1 alpha-2 country code                                                        |
| `language`  | string | No       | --                                                 | 2-letter language code                                                                 |
| `url`       | string | No       | `https://widget.criteo.com/m/event?version=s2s_v0` | API endpoint override                                                                  |
| `user_data` | object | No       | --                                                 | Identity mapping (`mapped_user_id`, `email`, `retailer_visitor_id`, `ip`, `useragent`) |

## Event Mapping

| walkerOS Event     | Criteo Event Name       |
| ------------------ | ----------------------- |
| `page view`        | `viewHome` / `viewPage` |
| `product view`     | `viewItem`              |
| `product list`     | `viewList`              |
| `product add`      | `addToCart`             |
| `cart view`        | `viewBasket`            |
| `checkout start`   | `beginCheckout`         |
| `checkout payment` | `addPaymentInfo`        |
| `order complete`   | `trackTransaction`      |
| `user login`       | `login`                 |

Set the Criteo event name via each rule's `name` field. Arbitrary string names
are accepted in addition to the standard names above.

## User Identity

Criteo matches users via three signals. Wire them through `user_data`:

| Field                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| `mapped_user_id`      | Criteo GUM ID                                       |
| `email`               | Raw email — hashed to MD5, SHA-256 and SHA-256(MD5) |
| `retailer_visitor_id` | Stable retailer visitor identifier                  |
| `ip`                  | Client IP address (optional)                        |
| `useragent`           | Client user agent (optional)                        |

```json
{
  "settings": {
    "partnerId": "YOUR_PARTNER_ID",
    "callerId": "YOUR_CALLER_ID",
    "user_data": {
      "mapped_user_id": "user.id",
      "email": "user.email",
      "retailer_visitor_id": "user.device"
    }
  }
}
```

### Email Hashing

Raw email addresses are lowercased and trimmed, then hashed into all three
Criteo-expected formats before sending:

- `md5` — MD5 hex digest
- `sha256` — SHA-256 hex digest
- `sha256_md5` — SHA-256 hex of the MD5 hex string

If a pre-hashed value is passed instead of a raw email, it is detected by hex
length (32 for MD5, 64 for SHA-256) and passed through without re-hashing.

## Deduplication

Criteo Events API supports deduplication with Criteo OneTag via the
`deduplication_page_view_id` field on each event. Wire it through the mapping's
`data.map.deduplication_page_view_id`.

## Links

- [Criteo Events API Guide](https://guides.criteotilt.com/events-api/)
- [walkerOS Documentation](https://www.walkeros.io)

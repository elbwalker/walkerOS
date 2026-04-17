# @walkeros/server-destination-bing

Server-side Microsoft Advertising (Bing UET) Conversions API destination for
walkerOS. Sends conversion events directly to Microsoft's UET CAPI via HTTP POST
for reliable server-to-server tracking.

## Installation

```bash
npm install @walkeros/server-destination-bing
```

## Quick Start

```json
{
  "destinations": {
    "bing": {
      "package": "@walkeros/server-destination-bing",
      "config": {
        "settings": {
          "tagId": "YOUR_UET_TAG_ID",
          "accessToken": "YOUR_ACCESS_TOKEN"
        },
        "mapping": {
          "order": {
            "complete": {
              "name": "purchase",
              "data": {
                "map": {
                  "customData": {
                    "map": {
                      "value": "data.total",
                      "currency": "data.currency",
                      "transactionId": "data.id",
                      "pageType": { "value": "purchase" }
                    }
                  }
                }
              }
            }
          },
          "page": {
            "view": {
              "settings": { "eventType": "pageLoad" }
            }
          }
        }
      }
    }
  }
}
```

## Settings

| Setting                     | Type     | Required | Default                              | Description                                                         |
| --------------------------- | -------- | -------- | ------------------------------------ | ------------------------------------------------------------------- |
| `accessToken`               | string   | Yes      | --                                   | Long-lived UET CAPI token from Microsoft Advertising                |
| `tagId`                     | string   | Yes      | --                                   | Microsoft Advertising UET tag ID                                    |
| `url`                       | string   | No       | `https://capi.uet.microsoft.com/v1/` | Custom Bing UET CAPI base URL                                       |
| `doNotHash`                 | string[] | No       | `[]`                                 | User data fields to skip SHA-256 hashing                            |
| `user_data`                 | object   | No       | --                                   | Default user data mapping (e.g. `{ em: 'user.email' }`)             |
| `dataProvider`              | string   | No       | `walkerOS`                           | Identifier of the data source                                       |
| `continueOnValidationError` | boolean  | No       | --                                   | When true, Microsoft continues ingesting events despite soft errors |

## Event Types

Bing UET distinguishes two event types:

| `eventType` | When to Use                                            |
| ----------- | ------------------------------------------------------ |
| `pageLoad`  | Page views — no `eventName` required                   |
| `custom`    | All other conversions (default) — `eventName` required |

Override per event via `mapping.settings.eventType`:

```json
{
  "mapping": {
    "page": {
      "view": { "settings": { "eventType": "pageLoad" } }
    }
  }
}
```

For `custom` events, the `eventName` defaults to the walkerOS event name;
override it via the rule's `name` field.

## User Data & Hashing

Only `em` and `ph` are SHA-256 hashed before sending. All other identity fields
pass through as-is:

| Field             | Hashed | Description                                             |
| ----------------- | ------ | ------------------------------------------------------- |
| `em`              | Yes    | Email — normalized (dots/alias removed) then lowercased |
| `ph`              | Yes    | Phone number (trimmed)                                  |
| `anonymousId`     | No     | Anonymous ID                                            |
| `externalId`      | No     | External / customer ID                                  |
| `msclkid`         | No     | Microsoft click ID                                      |
| `clientIpAddress` | No     | Client IP address (IPv4 or IPv6)                        |
| `clientUserAgent` | No     | Browser user agent string                               |
| `idfa`            | No     | iOS IDFA                                                |
| `gaid`            | No     | Android advertising ID (GAID)                           |

### Microsoft-specific email normalization

Before hashing, emails are normalized as follows:

1. Trim whitespace
2. Lowercase
3. Remove dots from the user portion (e.g. `a.b.c@example.com` →
   `abc@example.com`)
4. Strip `+alias` suffix (e.g. `user+promo@example.com` → `user@example.com`)

Use the `doNotHash` setting to skip hashing for pre-hashed values.

## customData Structure

Properties must be nested under `customData`:

```json
{
  "data": {
    "map": {
      "customData": {
        "map": {
          "value": "data.total",
          "currency": "data.currency",
          "transactionId": "data.id",
          "items": {
            "loop": [
              "nested",
              {
                "map": {
                  "id": "data.id",
                  "name": "data.name",
                  "price": "data.price",
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

Common `customData` fields: `value`, `currency`, `transactionId`, `items`,
`itemIds`, `pageType`, `eventCategory`, `eventLabel`, `eventValue`,
`searchTerm`, `ecommTotalValue`, `ecommCategory`, `hotelData`.

## Deduplication

The destination uses `event.id` as UET's `eventId`. When using both the UET
JavaScript tag client-side and this server destination, Microsoft dedupes
matching events across channels by `eventId` + `eventName`.

## Consent

All events sent to this destination include `adStorageConsent: "G"` (granted).
Gate the destination via walkerOS consent rules at the collector level rather
than sending denied events with `D`.

## Links

- [Microsoft UET CAPI Documentation](https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking-capi)
- [walkerOS Documentation](https://www.walkeros.io)

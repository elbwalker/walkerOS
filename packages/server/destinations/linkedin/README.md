# @walkeros/server-destination-linkedin

LinkedIn Conversions API (CAPI) server destination for walkerOS. Streams
conversion events to LinkedIn via server-to-server HTTPS POST.

## Installation

```bash
npm install @walkeros/server-destination-linkedin
```

## Minimal Config

```json
{
  "destinations": {
    "linkedin": {
      "package": "@walkeros/server-destination-linkedin",
      "config": {
        "consent": { "marketing": true },
        "settings": {
          "accessToken": "$env:LINKEDIN_ACCESS_TOKEN",
          "conversionRuleId": "12345678"
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
    "linkedin": {
      "package": "@walkeros/server-destination-linkedin",
      "config": {
        "consent": { "marketing": true },
        "settings": {
          "accessToken": "$env:LINKEDIN_ACCESS_TOKEN",
          "conversionRuleId": "12345678",
          "apiVersion": "202604",
          "user_data": {
            "email": "user.email",
            "li_fat_id": "context.li_fat_id",
            "firstName": "user.firstName",
            "lastName": "user.lastName",
            "companyName": "user.company",
            "countryCode": "user.country"
          }
        },
        "mapping": {
          "order": {
            "complete": {
              "settings": {
                "conversion": {
                  "map": {
                    "value": "data.total",
                    "currency": { "key": "data.currency", "value": "USD" }
                  }
                }
              }
            }
          },
          "form": {
            "submit": {}
          }
        }
      }
    }
  }
}
```

## Settings

| Setting            | Type     | Required | Default                            | Description                               |
| ------------------ | -------- | -------- | ---------------------------------- | ----------------------------------------- |
| `accessToken`      | string   | yes      | -                                  | OAuth 2.0 Bearer token                    |
| `conversionRuleId` | string   | yes      | -                                  | Default conversion rule ID (numeric)      |
| `apiVersion`       | string   | no       | `"202604"`                         | `Linkedin-Version` header (YYYYMM format) |
| `doNotHash`        | string[] | no       | `[]`                               | User data fields already hashed           |
| `url`              | string   | no       | `"https://api.linkedin.com/rest/"` | API base URL override                     |
| `user_data`        | object   | no       | -                                  | Mapping config for user identifiers       |

## Mapping Settings

Per-event overrides via `mapping.settings.conversion`:

| Field      | Type          | Description                                |
| ---------- | ------------- | ------------------------------------------ |
| `ruleId`   | string        | Override `conversionRuleId` for this event |
| `value`    | string/number | Conversion monetary value                  |
| `currency` | string        | ISO 4217 currency code                     |

## User Identification

The destination supports two user identifier types:

- **SHA256_EMAIL** - Email address, automatically SHA-256 hashed (lowercase,
  trimmed). Source: `user.email` or `settings.user_data.email` mapping.
- **LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID** - LinkedIn first-party click ID
  (`li_fat_id`). Not hashed. Source: `settings.user_data.li_fat_id` mapping.

At least one identifier is required per event. Events without any identifier are
silently skipped.

Optional `userInfo` fields (improve match rate): `firstName`, `lastName`,
`title`, `companyName`, `countryCode`. Requires both `firstName` and `lastName`
to be present.

## Deduplication

The walkerOS event `id` is automatically sent as `eventId` in the CAPI payload.
When both the web destination (Insight Tag) and server destination are active,
LinkedIn deduplicates using this shared ID. The browser event takes priority.

## Multi-Rule Setup

Use separate destination instances for different conversion rules:

```json
{
  "destinations": {
    "linkedin-purchases": {
      "package": "@walkeros/server-destination-linkedin",
      "config": {
        "settings": {
          "accessToken": "$env:LINKEDIN_TOKEN",
          "conversionRuleId": "11111111"
        },
        "mapping": { "order": { "complete": {} } }
      }
    },
    "linkedin-leads": {
      "package": "@walkeros/server-destination-linkedin",
      "config": {
        "settings": {
          "accessToken": "$env:LINKEDIN_TOKEN",
          "conversionRuleId": "22222222"
        },
        "mapping": { "form": { "submit": {} } }
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

- [LinkedIn Conversions API docs](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api)
- [walkerOS documentation](https://www.walkeros.io/docs/destinations/server/linkedin-capi)

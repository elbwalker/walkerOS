---
'@walkeros/core': minor
---

Breaking change: Unified dynamic pattern syntax in Flow configuration, sorry!

**New syntax:**

- `$def.name` - Reference definitions (replaces
  `{ "$ref": "#/definitions/name" }`)
- `$var.name` - Reference variables (replaces `$variables.name`)
- `$env.NAME` or `$env.NAME:default` - Reference environment variables

**Migration:**

| Old Syntax                              | New Syntax                             |
| --------------------------------------- | -------------------------------------- |
| `{ "$ref": "#/definitions/itemsLoop" }` | `$def.itemsLoop`                       |
| `$variables.currency`                   | `$var.currency`                        |
| `${GA4_ID}` or `${GA4_ID:default}`      | `$env.GA4_ID` or `$env.GA4_ID:default` |

**Note:** Only `$env` supports defaults (`:default`) because environment
variables are external and unpredictable. Variables (`$var`) are explicitly
defined in config, so missing ones indicate a configuration error and will
throw.

**Example:**

```json
{
  "variables": { "currency": "EUR" },
  "definitions": {
    "itemsLoop": { "loop": ["nested", { "map": { "item_id": "data.id" } }] }
  },
  "destinations": {
    "ga4": {
      "config": {
        "measurementId": "$env.GA4_ID:G-DEMO123",
        "currency": "$var.currency",
        "items": "$def.itemsLoop"
      }
    }
  }
}
```

---
'@walkeros/collector': minor
'@walkeros/core': minor
---

Add array support for transformer chain configuration

Enables explicit control over transformer chain order by accepting arrays for
`next` and `before` properties, bypassing automatic chain resolution.

**Array chain behavior:**

| Syntax                           | Behavior                                               |
| -------------------------------- | ------------------------------------------------------ |
| `"next": "validate"`             | Walks chain via each transformer's `next` property     |
| `"next": ["validate", "enrich"]` | Uses exact order specified, ignores transformer `next` |

**Example:**

```json
{
  "sources": {
    "http": {
      "package": "@walkeros/server-source-express",
      "next": ["validate", "enrich", "redact"]
    }
  },
  "destinations": {
    "analytics": {
      "package": "@walkeros/server-destination-gcp",
      "before": ["format", "anonymize"]
    }
  }
}
```

When walking a chain encounters an array `next`, it appends all items and stops
(does not recursively resolve those transformers' `next` properties).

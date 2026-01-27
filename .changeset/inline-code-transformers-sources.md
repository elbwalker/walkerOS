---
'@walkeros/collector': minor
'@walkeros/core': minor
'@walkeros/cli': minor
---

Add `code: true` support for transformers and sources

Enables inline code execution for transformers and sources, matching the
existing destination capability. Users can now define custom logic directly in
flow configuration without creating external packages.

```json
{
  "transformers": {
    "enrich": {
      "code": true,
      "config": {
        "settings": {
          "push": "event.data.enrichedAt = Date.now(); return event;"
        }
      }
    }
  }
}
```

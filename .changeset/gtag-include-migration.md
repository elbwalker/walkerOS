---
'@walkeros/web-destination-gtag': major
---

**BREAKING:** `settings.include` and `mapping.settings.*.include` have been
removed. Use `config.include` (destination-level) and `mapping.include`
(per-event rule-level) instead. The include logic is now handled by the
walkerOS core/collector — the destination receives pre-flattened properties
in `context.data` automatically.

Migration:

Before:
```json
"config": {
  "settings": { "ga4": { "include": ["data"] } }
}
```

After:
```json
"config": {
  "include": ["data"]
}
```

For per-event overrides:

Before:
```json
"mapping": { "order": { "complete": { "settings": { "ga4": { "include": ["data", "globals"] } } } } }
```

After:
```json
"mapping": { "order": { "complete": { "include": ["data", "globals"] } } }
```

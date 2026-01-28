---
'@walkeros/collector': minor
'@walkeros/core': minor
'@walkeros/cli': minor
---

Add inline code syntax for sources, transformers, and destinations

Enables defining custom logic directly in flow.json using `code` objects instead
of requiring external packages. This is ideal for simple one-liner
transformations.

**Example:**

```json
{
  "transformers": {
    "enrich": {
      "code": {
        "push": "$code:(event) => ({ ...event, data: { ...event.data, enriched: true } })"
      },
      "config": {}
    }
  }
}
```

**Code object properties:**

- `push` - The push function with `$code:` prefix (required)
- `type` - Optional instance type identifier
- `init` - Optional init function with `$code:` prefix

**Rules:**

- Use `package` OR `code`, never both (CLI validates this)
- `config` stays separate from `code`
- `$code:` prefix outputs raw JavaScript at bundle time

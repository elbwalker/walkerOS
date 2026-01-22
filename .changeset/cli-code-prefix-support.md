---
'@walkeros/cli': patch
---

Add `$code:` prefix support for inline JavaScript in flow.json

Values prefixed with `$code:` are output as raw JavaScript instead of quoted
strings in the bundled output. This enables features like `fn:` callbacks and
`condition:` predicates directly in JSON configuration files.

Example:

```json
{ "fn": "$code:(value) => value.toUpperCase()" }
```

Outputs:

```javascript
{
  fn: (value) => value.toUpperCase();
}
```

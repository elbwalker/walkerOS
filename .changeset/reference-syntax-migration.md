---
'@walkeros/core': minor
'@walkeros/cli': minor
'@walkeros/collector': minor
'@walkeros/mcp': minor
'@walkeros/explorer': minor
'walkeros': minor
---

**BREAKING:** Unified reference syntax: `$store:id` and `$secret:NAME` now use
the dot separator: `$store.id` and `$secret.NAME`.

The coherent rule across every walkerOS reference is:

- **`.`** key or path (resolver looks up or walks what follows)
- **`:`** literal value or raw-code payload (resolver uses what follows
  verbatim)

`$var.`, `$def.`, `$env.NAME[:default]`, `$contract.`, and `$code:(…)` are
unchanged, they already fit the rule.

Every shipped example, published `walkerOS.json` metadata, doc page, and skill
has been updated. A new canonical reference-syntax guide lives at
`/docs/guides/reference-syntax`. Regex constants (`REF_VAR`, `REF_DEF`,
`REF_ENV`, `REF_CONTRACT`, `REF_STORE`, `REF_SECRET`, `REF_CODE_PREFIX`) are
exported from `@walkeros/core` import these instead of hand-rolling regexes.

### Upgrade

Search-and-replace across your flow configs:

```
$store:<id>      → $store.<id>
$secret:<NAME>   → $secret.<NAME>
```

Everything else stays the same. Your `$var.*`, `$def.*`, `$env.*`,
`$contract.*`, and `$code:*` references need no changes.

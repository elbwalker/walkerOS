---
'@walkeros/web-source-browser': minor
'@walkeros/web-source-session': minor
---

Session detection extracted to standalone sourceSession

- New `sourceSession` for composable session management
- Browser source no longer includes session by default
- To restore previous behavior, add sourceSession alongside browser source:

```typescript
sources: {
  browser: sourceBrowser,
  session: { code: sourceSession, config: { storage: true } }
}
```

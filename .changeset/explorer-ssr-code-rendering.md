---
'@walkeros/explorer': patch
---

Read-only code snippets now render their highlighted content during server-side
rendering instead of waiting for the browser, so code is visible on first paint
and in no-JS and search-engine contexts. `CodeSnippet` no longer ships the
Monaco editor for read-only display.

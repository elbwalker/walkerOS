---
'@walkeros/web-source-browser': patch
---

`walker init <element>` now re-initializes a scope cleanly: `visible` and
`impression` triggers on elements in the re-initialized scope fire (previously
silent), and re-initializing the same scope no longer stacks duplicate `pulse`,
`wait`, `hover`, or visibility triggers. One-shot `load` triggers still fire on
each call.

---
'@walkeros/web-source-session': minor
---

Add env.window and env.document to session source Env interface. Session
detection (window, storage, performance) now uses injected globals when
provided, enabling full simulation without a browser environment.

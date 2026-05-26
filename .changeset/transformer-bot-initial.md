---
'@walkeros/server-transformer-bot': patch
---

New server-side bot and AI-agent detection transformer. Annotates events with
`user.botScore`, `user.agentScore`, and optionally `user.agentProduct` (the
matched user-agent, e.g. `'ChatGPT-User'`). It wraps `isbot` and a curated
AI-agent UA map. Annotate-only — events are never dropped; destinations filter
via mapping.

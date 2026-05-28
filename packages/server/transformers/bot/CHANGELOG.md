# @walkeros/server-transformer-bot

## 4.1.2

### Patch Changes

- @walkeros/core@4.1.2

## 4.1.1

### Patch Changes

- f69e5f6: New server-side bot and AI-agent detection transformer. Annotates
  events with `user.botScore`, `user.agentScore`, and optionally
  `user.agentProduct` (the matched user-agent, e.g. `'ChatGPT-User'`). It wraps
  `isbot` and a curated AI-agent UA map. Annotate-only — events are never
  dropped; destinations filter via mapping.
- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
  - @walkeros/core@4.1.1

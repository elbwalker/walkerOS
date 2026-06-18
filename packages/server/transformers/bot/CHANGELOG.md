# @walkeros/server-transformer-bot

## 4.2.1

### Patch Changes

- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
  - @walkeros/core@4.2.1

## 4.2.0

### Patch Changes

- e8f6909: Documentation fix: server source `config.ingest` examples now use the
  `map` operator with direct request field paths instead of a bare object. A
  bare object like `{ url: 'req.url' }` is silently inert, so the ingest stayed
  empty and downstream `ingest.*` fields never resolved. Affects package hints,
  READMEs, the core source type docs, and the bundled CLI example.
- Updated dependencies [76d32c1]
- Updated dependencies [908d6f0]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [e8f6909]
- Updated dependencies [c27d3c1]
- Updated dependencies [654ba38]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/core@4.2.0

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

---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': minor
'@walkeros/runner': minor
---

`startFlow({ observe })`, or `collector.observe` in a flow file, starts the
Observe reporter: `usage` posts counters, gauges and issues every `interval` (10
to 300 seconds, default 60), and `preview` posts one row per event and per
destination outcome, as NDJSON with a Bearer token. It is never awaited on the
event path, and a failing report is one ERROR line a minute. A production web
bundle carries no reporter; only a preview build, whose browser wrap is given
`observe: { preview: { url, token } }`, does. On the minimal flow that build
grows by 16,064 bytes raw and 6,308 gzipped. `walkeros push` and simulate send
nothing.

Migration:

- `Logger.Config.mask` is optional and `Logger.Instance.mask(text)` is required.
  A logger built by hand needs a `mask`; `mask: (text) => text` is enough.
- `createBatchedPoster` posts rows of any shape and returns
  `{ push, flush, send, dropped }`; its versioned envelope, `onError` and
  `onStatus` are gone, and `onResult` says whether a post was a page leave's
  `keepalive` one. A page-leave body is at most `KEEPALIVE_BODY_BYTES` (16,384).
- `redactLine` is exported from `@walkeros/core` too (`scrubSecrets` stays in
  `@walkeros/core/node`). Both mask every `wos_` token and the credential after
  `Bearer` or `Basic`.
- `FlowState.seq` and `'sampled_out'` are removed from `skipReason`; nothing set
  them.

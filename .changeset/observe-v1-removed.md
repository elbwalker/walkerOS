---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/web-core': minor
'@walkeros/cli': minor
'@walkeros/runner': minor
'@walkeros/web-destination-gtag': minor
---

Observe v1 is removed: no `elbObserve` URL parameter, no Observe sessions, no
journey assembly and no trace-level capture of vendor calls. The new Observe
reporter replaces it (see the Observe reporter changeset).

Migration:

- Delete `config.observe`, `collector.observe` of the old shape, the `observe`
  `startFlow` option, `pageObserveSlot`, `elbPreviewSession` and the `observe`
  wrap option. `flows.<name>.config` now accepts only `platform`, `url`,
  `settings` and `bundle`; any other key fails `walkeros validate` with
  `UNKNOWN_KEY` at its path.
- `observeEnv` is now `recordEnv` and `ObservedEnv` is `RecordedEnv`, with no
  alias. The recorder takes no `record` callback and reports no `unresolved`
  paths, and `wrapEnv` no longer returns `unresolved`.
- Removed from `@walkeros/core`: `observeFromEnv`, `assembleJourneys` and the
  journey types, `createTelemetryObserver`, the trace state helpers,
  `Destination.Instance.calls`, `Collector.Instance.observeLevel` and
  `FlowState.calls`. The `observers` option and `FlowState` stay.
- A page on the new web-core no longer strips the old `elbObserve` and
  `elbPreviewSession` URL parameters (`elbPreview` is still stripped). The
  preview grant verifier takes a page and its origin only (`origin` is
  required); the `ses` and `sb` claims are gone.
- The runner no longer reads `WALKEROS_OBSERVE_LEVEL`, the observer variables or
  the `WALKEROS_PREVIEW_*` intake variables, and `createHealthServer` takes
  `(port, logger)`. The `previewGrantTargets` wrap option is removed.

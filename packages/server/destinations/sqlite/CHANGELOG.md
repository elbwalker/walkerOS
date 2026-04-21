# @walkeros/server-destination-sqlite

## 3.4.0

### Minor Changes

- 74940cc: Add `@walkeros/server-destination-sqlite`: server destination that
  persists walkerOS events to SQLite. One destination, two drivers behind a
  single interface: `better-sqlite3` for local files and `:memory:`,
  `@libsql/client` for remote Turso / libSQL / sqld. Driver is auto-selected
  from the connection URL. Both SDKs are optional peer dependencies.
  Auto-creates a canonical events table on init (opt-out via
  `schema: 'manual'`), caches a prepared INSERT, closes the connection on
  `destroy()`. Per-rule `mapping.settings.table` override supported.
- 724f97e: Migrate every step example in every walkerOS package to the
  standardized `[callable, ...args][]` shape introduced in `@walkeros/core`.
  Every step example's `out` is now an array of effect tuples whose first
  element is the callable's public SDK name (`'gtag'`, `'analytics.track'`,
  `'fbq'`, `'dataLayer.push'`, `'sendServer'`, `'fetch'`, `'trackClient.track'`,
  `'amplitude.track'`, `'fs.writeFile'`, `'producer.send'`, `'client.xadd'`,
  `'client.send'`, `'dataset.table.insert'`, etc.). Source examples use `'elb'`
  as the callable; transformer examples use the reserved `'return'` keyword;
  store examples use store-operation callables (`'get'`, `'set'`). Tests capture
  real calls on each component's spy and assert against `example.out` directly —
  the hardcoded `PACKAGE_CALLS` registry in the app is no longer consulted
  (emptied; plan #3 removes it structurally).

### Patch Changes

- Updated dependencies [74940cc]
- Updated dependencies [525f5d9]
  - @walkeros/core@3.4.0
  - @walkeros/server-core@3.4.0

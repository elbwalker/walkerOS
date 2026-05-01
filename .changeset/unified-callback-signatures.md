---
'@walkeros/core': major
'@walkeros/cli': major
'@walkeros/collector': major
'@walkeros/web-source-session': major
---

**BREAKING:** Unified callback signatures across mapping and on.\*
subscriptions.

Every callback in walkerOS now reads `(data, context) => result`. Sources,
transformers, destinations, and stores already conformed; mapping and on.\* join
the family in v4.1.

### Mapping callbacks

`fn`, `condition`, and `validate` now share a single shape:

`(value, context: Mapping.Context) => result`

`Mapping.Options` is removed. Replaced by `Mapping.Context`:

```ts
interface Context {
  event: WalkerOS.DeepPartialEvent;
  mapping: Value | Rule;
  collector: Collector.Instance; // required
  logger: Logger.Instance; // required
  consent?: WalkerOS.Consent; // resolved consent
}
```

Rule-level `condition` is now `(event, context) => boolean`.
`Mapping.Options.props` is removed (no production callers).

#### Mapping upgrade

```ts
// before
const fn: Mapping.Fn = (value, mapping, options) => /* … */;
const cond: Mapping.Condition = (value, mapping, collector) => /* … */;
const val: Mapping.Validate = (value) => /* … */;

// after
const fn: Mapping.Fn = (value, context) => /* … */;
const cond: Mapping.Condition = (value, context) => /* … */;
const val: Mapping.Validate = (value, context) => /* … */;
```

In `$code:` strings (flow.json):

```json
// before
"fn": "$code:(value, mapping, options) => …"
"condition": "$code:(value, mapping, collector) => …"

// after
"fn": "$code:(value, context) => …"
"condition": "$code:(value, context) => …"
```

`context.mapping` replaces the second positional arg; `context.collector`,
`context.logger`, and `context.consent` are all available.

One-arg callbacks like `(value) => value.toUpperCase()` continue to work
unchanged.

### On.\* subscription callbacks

`walker.on('consent', …)`, `walker.on('ready', …)`, etc. now receive
`(data, context: On.Context) => void | Promise<void>`. The legacy `Context`
interface, `*Config` aliases, and `Options` discriminated union are removed.

```ts
interface Context {
  collector: Collector.Instance; // required
  logger: Logger.Instance; // required
}

type Fn<TData = unknown> = (
  data: TData,
  context: Context,
) => void | Promise<void>;

type ConsentFn = Fn<WalkerOS.Consent>;
type SessionFn = Fn<Collector.SessionData | undefined>;
type UserFn = Fn<WalkerOS.User>;
type ReadyFn = Fn<void>;
type RunFn = Fn<void>;
type GenericFn = Fn<unknown>;
```

The new `On.Subscription` alias is the registerable union for
`walker.on(action, X)`.

#### On.\* upgrade

```ts
// before
walker.on('consent', { marketing: (collector, consent) => /* … */ });
walker.on('ready', (collector) => /* … */);
walker.on('session', (collector, session) => /* … */);

// after
walker.on('consent', { marketing: (consent, ctx) => /* … */ });
walker.on('ready', (_, ctx) => /* … */);
walker.on('session', (session, ctx) => /* … */);
```

`ctx.collector` replaces the positional first arg; `ctx.logger` is also
available.

### Why both at once

Both refactors follow the same `(data, context)` pattern. Shipping them in one
release means consumers do one search-and-replace pass instead of two, and the
codebase reaches full callback-signature consistency in v4.1.

---
'@walkeros/core': minor
'@walkeros/cli': minor
---

Add an optional `setup` lifecycle to destinations, sources, and stores.

Each package may now implement `setup?: SetupFn` to provision external resources
(BigQuery datasets and tables, Pub/Sub topics and subscriptions, SQLite tables,
webhook registrations, etc.). Setup is triggered only by the new
`walkeros setup <kind>.<name>` CLI command, never automatically by the runtime,
push, or deploy. Idempotency, ordering, and error semantics are the package's
responsibility; the framework provides the type slot, the CLI invocation, and a
`resolveSetup(value, defaults)` helper.

`LifecycleContext<C, E>` is the new shared context type used by both `setup` and
`destroy`. `DestroyContext` remains as a deprecated type alias for one minor
cycle. The `Types` bundle on `Destination`, `Source`, and `Store` gains a
5th/6th/4th positional slot for setup options; existing aliases compile
unchanged because the slot defaults to `unknown`.
`Config<T>.setup?: boolean | SetupOptions<T>` is added across all three kinds
and validated by the corresponding Zod `ConfigSchema` plus the flow component
schemas in `@walkeros/core/schemas/flow.ts`.

CLI:

- `walkeros setup <kind>.<name>` runs a single component's `setup()` function.
- `<kind>` is `source`, `destination`, or `store` (transformers have no
  provisioning).
- `--config <path>` (default `./flow.json`), `--flow <name>` for multi-flow
  configs, plus standard `--json` / `--verbose` / `--silent`.
- Exit 0 on success or skip; non-zero on failure. Skip narration covers three
  cases: no `setup()` on the package, `config.setup === false`, or
  `config.setup` unset.
- When the package's `setup()` returns a non-undefined value, the CLI emits it
  as JSON on stdout for `jq` piping.

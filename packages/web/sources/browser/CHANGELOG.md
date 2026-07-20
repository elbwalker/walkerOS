# @walkeros/web-source-browser

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [74eacdd]
  - @walkeros/core@4.3.1
  - @walkeros/collector@4.3.1
  - @walkeros/web-core@4.3.1

## 4.3.0

### Minor Changes

- 7527c41: Click and submit triggers now fire in the capture phase, reading
  tagged elements at click time. This fixes lost tagging in single-page apps
  where a click re-renders and unmounts the tagged element (events previously
  fell back to `page` with no data), and means `stopPropagation` no longer
  suppresses a tagged click. Set `capture: false` on the source to restore the
  previous bubble-phase behavior.
- 9506e3e: The browser source now supports a `data-elbobserve` attribute. Mark a
  container with it and any tagged content a SPA injects into that container is
  auto-registered for tracking, and cleaned up when removed, without calling
  `walker init` after each injection. Works in light DOM and open shadow roots.
- ebd193f: The browser source now supports a `data-elbuser` attribute to set
  persistent user identity from the DOM. Tag any element with
  `data-elbuser="id:u123;loggedin:true"` and the source applies it as collector
  user state right before the page view, so the page view and every event after
  it carry the user. Multiple elements merge, and an absent attribute leaves any
  existing user untouched.
- e01036e: The elbLayer is append-only with guaranteed ordering: walker commands
  apply immediately, events process in push order once the source starts, and
  entries stay inspectable in the array. `walker init` now works from every
  entry point, including `elbLayer.push`. The browser source owns `window.elb`
  (name via `settings.elb`) and returns a result promise; the `ELBLayer` and
  `ELBLayerConfig` types were removed.
- 83ea3c6: The visible and impression triggers now fire for elements inside open
  shadow DOM, and scroll depth is computed correctly for shadow-nested elements.
  Visibility still accounts for occlusion across open shadow roots, so a
  genuinely covered element does not trigger. Closed shadow subtrees can be
  tracked by passing the closed root reference to walker init.
- d28a8ea: The `impression` and `visible` triggers now count an element as seen
  when at least half of it, or half of the viewport, whichever is smaller, is on
  screen along each axis for one continuous second in a foreground tab. Elements
  larger than the viewport now fire, where previously they could not, and
  elements are detected reliably when a framework injects them before rendering.
  Expect an increase in impression volume, particularly on small viewports and
  on pages with tall sections.

### Patch Changes

- 66a8c33: Fix a case where a `visible` / `impression` trigger could still fire
  shortly after the source or its scope was destroyed. Pending visibility timers
  are now cancelled during teardown.
- e6613f8: `walker init <element>` now re-initializes a scope cleanly: `visible`
  and `impression` triggers on elements in the re-initialized scope fire
  (previously silent), and re-initializing the same scope no longer stacks
  duplicate `pulse`, `wait`, `hover`, or visibility triggers. One-shot `load`
  triggers still fire on each call.
- Updated dependencies [83ea3c6]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
- Updated dependencies [d28a8ea]
- Updated dependencies [ebd193f]
  - @walkeros/web-core@4.3.0
  - @walkeros/collector@4.3.0
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- Updated dependencies [bd9188d]
- Updated dependencies [d8aebd1]
- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
- Updated dependencies [8afb7cc]
  - @walkeros/collector@4.2.1
  - @walkeros/core@4.2.1
  - @walkeros/web-core@4.2.1

## 4.2.0

### Minor Changes

- 21ac669: Add the `data-elb_` scoped generic attribute. It carries the same
  `key:value` properties as the blanket `data-elb-` generic, but only events
  whose triggered element is nested below the `data-elb_` element receive them.
  The `createTagger()` API gains a `scoped()` method and the `generate_tagging`
  MCP tool gains a `scoped` input to produce it. Use `data-elb-` for properties
  every trigger in an entity should carry, and `data-elb_` when only triggers
  within a specific branch should.

### Patch Changes

- 5b1a134: The single-instance guard is now scoped to the window instead of the
  module, so loading the tag more than once on the same page is inert rather
  than re-initializing. A second load no longer re-binds DOM triggers, re-adopts
  the event layer, or surfaces an error to the host page.
- 776e5f9: Step examples are no longer bundled into production output. They were
  accidentally exported from the production entry of these packages and pulled
  into bundled JS. Examples remain available via the package `./dev` subpath for
  simulation and testing.
- Updated dependencies [76d32c1]
- Updated dependencies [5b1a134]
- Updated dependencies [908d6f0]
- Updated dependencies [654ba38]
- Updated dependencies [c27d3c1]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [d65bbde]
- Updated dependencies [e8f6909]
- Updated dependencies [c27d3c1]
- Updated dependencies [126c0f1]
- Updated dependencies [654ba38]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/core@4.2.0
  - @walkeros/collector@4.2.0
  - @walkeros/web-core@4.2.0

## 4.1.2

### Patch Changes

- b506f2c: Fixes `elb('walker init', scope)` which previously did nothing.
  Calling `walker init` with a DOM element, an array of elements, or with no
  argument (defaults to `document`) now re-scans the scope for `data-elb*` tags
  and fires `load` triggers on the matched elements, matching the documented
  contract for SPA and infinite-scroll re-initialization.
  - @walkeros/collector@4.1.2
  - @walkeros/core@4.1.2
  - @walkeros/web-core@4.1.2

## 4.1.1

### Patch Changes

- edd3836: The browser source now releases its DOM event listeners, pulse
  intervals, and wait timeouts when the source is destroyed. This prevents
  memory growth and avoids duplicate events when the source is torn down or
  re-initialized.
- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
- Updated dependencies [edd3836]
  - @walkeros/core@4.1.1
  - @walkeros/collector@4.1.1
  - @walkeros/web-core@4.1.1

## 4.1.0

### Minor Changes

- fd6076e: Walker commands `destination`, `hook`, and `on` now take a single
  Init object: `elb('walker destination', { code, config })`,
  `elb('walker hook', { name, fn })`, `elb('walker on', { type, rules })`. The
  previous positional forms and the `{ push }` shorthand are removed; the
  `options` argument is gone from `collector.command`, `addDestination`, and
  `commonHandleCommand`.

### Patch Changes

- Updated dependencies [e155ff8]
- Updated dependencies [e800974]
- Updated dependencies [e155ff8]
- Updated dependencies [1a8f2d7]
- Updated dependencies [1a8f2d7]
- Updated dependencies [b276173]
- Updated dependencies [dd9f5ad]
- Updated dependencies [c60ef35]
- Updated dependencies [adeebea]
- Updated dependencies [13aaeaa]
- Updated dependencies [e800974]
- Updated dependencies [adeebea]
- Updated dependencies [6cdc362]
- Updated dependencies [e800974]
- Updated dependencies [e800974]
- Updated dependencies [058f7ed]
- Updated dependencies [28a8ac2]
- Updated dependencies [fd6076e]
  - @walkeros/core@4.1.0
  - @walkeros/collector@4.1.0
  - @walkeros/web-core@4.1.0

## 4.0.2

### Patch Changes

- @walkeros/collector@4.0.2
- @walkeros/web-core@4.0.2

## 4.0.1

### Patch Changes

- 1524275: Source lifecycle redesign: factory + eager `init` + collector-gated
  `on()`

  Source factories must now be side-effect-free. The collector calls
  `Instance.init()` on each source eagerly after all factories register.
  `require` no longer gates code execution. It gates `on(type)` delivery (events
  queue in `Instance.queueOn` until the source is started, then replay).
  `collector.pending.sources` has been removed; per-source state lives on
  `Source.Instance` (`queueOn`) and `Source.Config` (`init`, `require`).

  Migration: any source factory with side effects (queue draining, walker
  command emission, listener attachment) should move those into the returned
  Instance's optional `init` method. Tests asserting on
  `collector.pending.sources` should read `collector.sources[id]` and inspect
  `config.init` / `config.require` instead.

  Fixes the elbLayer queue replay clobbering fresh consent/user state,
  late-activated sources missing `walker run`, and inter-source require chains
  racing when a non-required source's init fired a state-mutating walker command
  before later require-gated sources had been registered.

- Updated dependencies [cb265eb]
- Updated dependencies [1524275]
  - @walkeros/collector@4.0.1
  - @walkeros/web-core@4.0.1

## 4.0.0

### Major Changes

- 93ea9c4: Event model v4: breaking changes to the `Event`, `Source`, and
  `Entity` shapes.
  - `event.id` is now a W3C span_id (16 lowercase hex chars), generated by the
    collector. Reference: W3C Trace Context (W3C Recommendation, January 2020).
  - `event.version`, `event.group`, `event.count` are removed.
  - `source.type` is now the source kind (e.g. `browser`, `gtag`, `mcp`, `cli`).
    New `source.platform` holds the runtime (`web` | `server` | `app` | ...).
  - `source.id` and `source.previous_id` are removed.
  - Browser source now sets `source.url` and `source.referrer`.
  - MCP source sets `source.tool` per emission. CLI source sets
    `source.command`.
  - `Entity.nested` and `Entity.context` are now optional. Root `event.nested`
    and `event.context` remain required.
  - Each source self-registers via TypeScript module augmentation of `SourceMap`
    in `@walkeros/core`.
  - App-side coordination (`/workspaces/developer/app`) is a follow-up plan, not
    part of this release. Telemetry from v4 CLI/MCP will not validate against
    the existing app schema until that follow-up ships.
  - `Mapping.Rule.skip` is renamed to `Mapping.Rule.silent`. Customer flow.json
    configs using `skip: true` in mapping rules must rename to `silent: true`.
    Hard cut: no legacy alias, the field is gone.

### Patch Changes

- Updated dependencies [93ea9c4]
- Updated dependencies [8e06b1f]
- Updated dependencies [1ef33d9]
  - @walkeros/collector@4.0.0
  - @walkeros/web-core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/collector@3.4.2
- @walkeros/web-core@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [75aa26b]
- Updated dependencies [caea905]
  - @walkeros/collector@3.4.1
  - @walkeros/web-core@3.4.1

## 3.4.0

### Minor Changes

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

- @walkeros/collector@3.4.0
- @walkeros/web-core@3.4.0

## 3.3.1

### Patch Changes

- Updated dependencies [b10144a]
- Updated dependencies [206185a]
- Updated dependencies [50e5d09]
- Updated dependencies [32ff626]
  - @walkeros/collector@3.3.1
  - @walkeros/web-core@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/collector@3.3.0
  - @walkeros/web-core@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [8cdc0bb]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
- Updated dependencies [a5d25bc]
- Updated dependencies [9a99298]
- Updated dependencies [884527d]
  - @walkeros/collector@3.2.0
  - @walkeros/web-core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/collector@3.1.1
- @walkeros/web-core@3.1.1

## 3.1.0

### Minor Changes

- a9149e4: Add createTrigger to browser source examples following unified
  Trigger.CreateFn interface. Step examples migrated to HTML content format with
  trigger metadata. Collector simulate.ts updated with dual-path support for
  createTrigger and legacy triggers.

### Patch Changes

- Updated dependencies [a9149e4]
- Updated dependencies [ff58828]
- Updated dependencies [df990d4]
  - @walkeros/collector@3.1.0
  - @walkeros/web-core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/collector@3.0.2
- @walkeros/web-core@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/collector@3.0.1
- @walkeros/web-core@3.0.1

## 3.0.0

### Patch Changes

- a30095c: Fix Shadow DOM support: use composedPath for event targets, recurse
  into open shadow roots for element discovery and property collection
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [499e27a]
- Updated dependencies [499e27a]
- Updated dependencies [a2aa491]
- Updated dependencies [b6c8fa8]
  - @walkeros/collector@3.0.0
  - @walkeros/web-core@3.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [fab477d]
  - @walkeros/collector@2.1.1
  - @walkeros/web-core@2.1.1

## 2.1.0

### Minor Changes

- 97df0b2: Step examples: upgrade all packages to blueprint pattern with inline
  mapping, no intermediate variables, no `all` export

### Patch Changes

- 60f0a1c: Add setup functions and renderer metadata for source simulation
- Updated dependencies [2bbe8c8]
- Updated dependencies [3eb6416]
- Updated dependencies [02a7958]
- Updated dependencies [026c412]
  - @walkeros/collector@2.1.0
  - @walkeros/web-core@2.1.0

## 2.0.1

## 1.1.4

### Patch Changes

- e7914fb: Update internal dependencies to use >= ranges
- Updated dependencies [32bfc92]
  - @walkeros/collector@2.0.0
  - @walkeros/web-core@2.0.0

## 1.1.3

### Patch Changes

- Updated dependencies [a4cc1ea]
- Updated dependencies [9599e60]
- Updated dependencies [e9c9faa]
  - @walkeros/collector@1.2.0
  - @walkeros/web-core@1.0.5

## 1.1.2

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/collector@1.1.2
  - @walkeros/web-core@1.0.4

## 1.1.1

### Patch Changes

- @walkeros/collector@1.1.1
- @walkeros/web-core@1.0.3

## 1.1.0

### Minor Changes

- a38d791: Session detection extracted to standalone sourceSession
  - New `sourceSession` for composable session management
  - Browser source no longer includes session by default
  - To restore previous behavior, add sourceSession alongside browser source:

  ```typescript
  sources: {
    browser: sourceBrowser,
    session: { code: sourceSession, config: { storage: true } }
  }
  ```

### Patch Changes

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/collector@1.1.0
  - @walkeros/web-core@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [b65b773]
  - @walkeros/collector@1.0.1
  - @walkeros/web-core@1.0.1

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/collector@1.0.0
  - @walkeros/web-core@1.0.0

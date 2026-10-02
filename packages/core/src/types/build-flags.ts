/**
 * Build-time feature flags.
 *
 * A bundler may `define` any of these as `false` to fold the matching feature
 * out of a bundle; the walkerOS CLI does so for browser bundles whose flow does
 * not use the feature. Left undefined (npm installs, plain bundlers) every
 * feature is on and behaviour is unchanged.
 *
 * A guard reads the flag inline, in block or `&&` form:
 * `if (typeof __WALKEROS_STATE__ === 'undefined' || __WALKEROS_STATE__) {...}`.
 * esbuild folds that shape away when the flag is defined false. It does not
 * fold an early `if (!flag) return;` or a module-level const holding the flag.
 *
 * When a flag is not defined at build time, each guard is a global lookup at
 * runtime, so a page could set `window.__WALKEROS_STORES__ = false` before the
 * collector starts. That only switches a feature off for that page (accepted,
 * low risk).
 *
 * The global type is frozen: an install with two copies of @walkeros/core
 * declares these `var`s twice, and TypeScript rejects differing types
 * (TS2403). Consumers must not redeclare the names as `const` (TS2451).
 */
declare global {
  /** Observe: telemetry posting and trace-level vendor-call capture. */
  var __WALKEROS_OBSERVE__: boolean | undefined;
  /** Declared flow stores. The default `__cache` store always exists. */
  var __WALKEROS_STORES__: boolean | undefined;
  /** Declarative step `state`. */
  var __WALKEROS_STATE__: boolean | undefined;
  /** Runtime validation of transformer step entries. */
  var __WALKEROS_VALIDATE__: boolean | undefined;
}

/** Names of the build-time feature flags a bundler may `define`. */
export type BuildFlag =
  | '__WALKEROS_OBSERVE__'
  | '__WALKEROS_STORES__'
  | '__WALKEROS_STATE__'
  | '__WALKEROS_VALIDATE__';

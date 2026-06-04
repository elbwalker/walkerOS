/**
 * Named bundle targets with frozen presets.
 *
 * A target is the ONLY input callers should pass. All internal booleans
 * (skipWrapper, withDev, platform, env injection) derive from the preset.
 * This prevents the class of bug where the same boolean means different
 * things in different code paths (see: skipWrapper conflation, 2026-04-16).
 */
export type BundleTarget =
  | 'cdn' // Production browser IIFE served via CDN
  | 'cdn-skeleton' // ESM skeleton, wrapped later via wrapSkeleton → IIFE
  | 'runner' // Server skeleton for long-running Node flow runtime
  | 'simulate' // Skeleton for in-process simulate (needs /dev schemas)
  | 'push'; // Skeleton for in-process push (needs /dev schemas)

export interface TargetPreset {
  /** If true, emit ESM skeleton. If false, emit IIFE via generateWebEntry. */
  skipWrapper: boolean;
  /**
   * If true, the skeleton carries the lazy `/dev` registry
   * (`'<pkg>': () => import('<pkg>/dev')`) so simulate/push can await schemas
   * on demand. Every skeleton target sets this true: the registry is an
   * unreferenced thunk, so the deploy wrap DCEs the whole /dev graph to zero
   * bytes. Only the finished IIFE (`cdn`) sets this false, since it has no
   * registry and needs none.
   */
  withDev: boolean;
  /**
   * Gates whether the browser build externalizes each `<pkg>/dev` subpath.
   *
   * Deploy skeletons (`cdn-skeleton`, `runner`) set this true: `<pkg>/dev` is
   * externalized so the lazy registry stays a literal `import('<pkg>/dev')` and
   * the deploy wrap DCEs the whole /dev graph to zero bytes.
   *
   * In-process targets (`simulate`, `push`) set this false: `<pkg>/dev` is NOT
   * externalized, so esbuild inlines the /dev graph into the single ESM. The
   * lazy thunk then resolves an already-bundled module, which is what lets the
   * lean simulate-server (cli + core only, no sibling node_modules) resolve
   * schemas host-free. Node platform is unaffected by this flag: it always keeps
   * step packages external, and that bare external prefix-covers `<pkg>/dev`.
   */
  externalizeDev: boolean;
  /** Runtime platform — controls env injection and Node/browser codegen. */
  platform: 'browser' | 'node';
  /**
   * If true, Stage 2 wrapper injects env.window/env.document into sources.
   * Only relevant for browser platform IIFE output.
   */
  injectEnv: boolean;
}

export const BUNDLE_TARGETS: Readonly<
  Record<BundleTarget, Readonly<TargetPreset>>
> = Object.freeze({
  cdn: Object.freeze({
    skipWrapper: false,
    withDev: false,
    externalizeDev: false,
    platform: 'browser',
    injectEnv: true,
  }),
  // skipWrapper emits the introspectable skeleton (not a finished bundle),
  // consumed by simulate/preview/deploy; node keeps step packages external for
  // on-disk resolution (see the skeleton branch in bundler.ts). Every skeleton
  // carries the lazy /dev registry (withDev:true); it is an unreferenced thunk
  // the deploy wrap DCEs, so a skeleton with the registry is safe to deploy.
  // The browser skeleton additionally externalizes each `<pkg>/dev` so the
  // registry stays a literal `import()` rather than inlining the /dev graph.
  'cdn-skeleton': Object.freeze({
    skipWrapper: true,
    withDev: true,
    externalizeDev: true,
    platform: 'browser',
    injectEnv: false,
  }),
  runner: Object.freeze({
    skipWrapper: true,
    withDev: true,
    externalizeDev: true,
    platform: 'node',
    injectEnv: false,
  }),
  simulate: Object.freeze({
    skipWrapper: true,
    withDev: true,
    externalizeDev: false,
    platform: 'node',
    injectEnv: false,
  }),
  push: Object.freeze({
    skipWrapper: true,
    withDev: true,
    externalizeDev: false,
    platform: 'node',
    injectEnv: false,
  }),
});

export function resolveTarget(target: BundleTarget): TargetPreset {
  const preset = BUNDLE_TARGETS[target];
  if (!preset) {
    throw new Error(
      `Unknown target: ${target}. Valid: ${Object.keys(BUNDLE_TARGETS).join(', ')}`,
    );
  }
  return preset;
}

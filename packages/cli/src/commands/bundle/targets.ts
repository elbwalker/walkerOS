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
  /** If true, include @walkeros/*\/dev imports for schema validation. */
  withDev: boolean;
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
    platform: 'browser',
    injectEnv: true,
  }),
  'cdn-skeleton': Object.freeze({
    skipWrapper: true,
    withDev: false,
    platform: 'browser',
    injectEnv: false,
  }),
  runner: Object.freeze({
    skipWrapper: true,
    withDev: false,
    platform: 'node',
    injectEnv: false,
  }),
  simulate: Object.freeze({
    skipWrapper: true,
    withDev: true,
    platform: 'node',
    injectEnv: false,
  }),
  push: Object.freeze({
    skipWrapper: true,
    withDev: true,
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

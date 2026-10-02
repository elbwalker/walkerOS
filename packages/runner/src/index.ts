/**
 * @walkeros/runner: runs prebuilt walkerOS flow artifacts.
 *
 * This package cannot bundle. Build a flow with `walkeros bundle` (from
 * `@walkeros/cli`), then start the artifact with `runneros start`.
 */

export { runCommand, assertPrebuiltArtifact } from './run.js';
export type { RunCommandOptions } from './types.js';
export {
  runPipeline,
  runShutdown,
  resolvePreviewGate,
  type PipelineOptions,
  type ShutdownDeps,
} from './pipeline.js';
export { loadFlow, type RuntimeConfig, type FlowHandle } from './runner.js';
export {
  resolveBundle,
  isPrebuiltArtifact,
  isArchive,
  type ResolvedBundle,
  type BundleSource,
} from './resolve-bundle.js';
export {
  createHeartbeat,
  getInstanceId,
  type HeartbeatConfig,
  type HeartbeatHandle,
} from './heartbeat.js';
export {
  createHealthServer,
  type HealthServer,
  type PreviewGateConfig,
} from './health-server.js';
export { fetchSecrets, SecretsHttpError } from './secrets-fetcher.js';
export { resolveRunToken, resolveAppUrl } from './credentials.js';
export {
  LogRing,
  ErrorRing,
  type RingEntry,
  type DedupedError,
  type RecentError,
  type RecentLogEntry,
} from './log-ring.js';
export { redactLine, redactErrors, redactLogs } from './redact.js';
export { VERSION } from './version.js';

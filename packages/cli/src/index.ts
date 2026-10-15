declare module '@walkeros/core' {
  interface SourceMap {
    cli: { type: 'cli'; platform: 'terminal'; command?: string };
  }
}

// === CLI Commands ===
// Export CLI command handlers
export { bundleCommand } from './commands/bundle/index.js';
export { pushCommand } from './commands/push/index.js';
export { validateCommand } from './commands/validate/index.js';
export { whoamiCommand } from './commands/auth/index.js';
export {
  telemetryStatusCommand,
  telemetryEnableCommand,
  telemetryDisableCommand,
} from './commands/telemetry/index.js';

// === Programmatic API ===
// High-level functions for library usage
export { bundle } from './commands/bundle/index.js';
export { buildDataPayload } from './commands/bundle/bundler.js';
export {
  classifyStepProperties,
  containsCodeMarkers,
} from './commands/bundle/config-classifier.js';
export { validateFlowStructure } from '@walkeros/core/dev';
export { wrapSkeleton } from './commands/bundle/wrap.js';
export {
  runBuildManifest,
  resolveManifestSource,
  BUILD_MANIFEST_ENV,
} from './commands/bundle/manifest.js';
export type { RunBuildManifestResult } from './commands/bundle/manifest.js';
export {
  BUILD_MANIFEST_VERSION,
  BUILD_ERROR_CODES,
  BuildManifestSchema,
  BuildArtifactSchema,
  BuildBundleArtifactSchema,
  BuildWrapArtifactSchema,
  BuildWrapOptionsSchema,
  BuildResultSchema,
} from './schemas/build-manifest.js';
export type {
  BuildManifest,
  BuildArtifact,
  BuildWrapOptions,
  BuildResult,
  BuildErrorCode,
} from './schemas/build-manifest.js';
export type { WrapSkeletonOptions } from './commands/bundle/wrap.js';
export {
  push,
  simulateSource,
  simulateTransformer,
  simulateDestination,
  simulateCollector,
  formatPushResult,
} from './commands/push/index.js';
export type {
  SimulateDataOptions,
  SimulateSourceOptions,
  SimulateTransformerOptions,
  SimulateDestinationOptions,
  SimulateCollectorOptions,
} from './commands/push/index.js';
export { validate } from './commands/validate/index.js';
export { resolveAccessToken } from './core/auth.js';
export { ApiError } from './core/api-error.js';
export type { ApiErrorDetail } from './core/api-error.js';
export {
  setClientContext,
  getClientContext,
  resetClientContext,
  clientContextHeaders,
} from './core/client-context.js';
export type { ClientType, ClientContext } from './core/client-context.js';
export { appFetch, appErrorMessage } from './core/app-fetch.js';
export type { AppFetchInit } from './core/app-fetch.js';
export { APP_PATHS } from './core/app-paths.js';
export { whoami } from './commands/auth/index.js';
export { readConfig, writeConfig, resolveAppUrl } from './lib/config-file.js';
export { VERSION } from './version.js';
export type { WalkerOSConfig } from './lib/config-file.js';

// === Utilities ===
// Export utilities for programmatic usage
export { loadConfig, loadJsonConfig } from './config/utils.js';
export { collectKnownSecrets } from './core/known-secrets.js';
export { resolveExportName } from './core/resolve-export-name.js';
export { selectDevExamples } from './commands/push/dev-examples.js';

// === Telemetry ===
export * as telemetry from './telemetry/index.js';

// === Types ===
// Export types for programmatic usage
// Config structure uses Flow.Json (root) and Flow (single flow) from @walkeros/core
export type {
  Flow,
  CLIBuildOptions,
  BuildOptions,
  MinifyOptions,
} from './types/bundle.js';
export type { BundleStats } from './commands/bundle/bundler.js';
export type { PushResult } from './commands/push/types.js';
export type { PrepareInput, PreparedFlow } from './commands/push/prepare.js';
export type { GlobalOptions } from './types/global.js';
export type {
  ValidateResult,
  ValidationType,
  ValidationError,
  ValidationWarning,
  ValidateCode,
  ValidateCheck,
  ValidateScope,
  ValidateSkip,
  ValidateDeferred,
} from './commands/validate/types.js';
export { VALIDATE_CODES } from './commands/validate/types.js';

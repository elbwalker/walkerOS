// === CLI Commands ===
// Export CLI command handlers
export { bundleCommand } from './commands/bundle/index.js';
export { simulateCommand } from './commands/simulate/index.js';
export { pushCommand } from './commands/push/index.js';
export { runCommand } from './commands/run/index.js';
export { validateCommand } from './commands/validate/index.js';
export { loginCommand } from './commands/login/index.js';
export { logoutCommand } from './commands/logout/index.js';
export { whoamiCommand } from './commands/auth/index.js';
export {
  listProjectsCommand,
  getProjectCommand,
  createProjectCommand,
  updateProjectCommand,
  deleteProjectCommand,
} from './commands/projects/index.js';
export {
  listFlowsCommand,
  getFlowCommand,
  createFlowCommand,
  updateFlowCommand,
  deleteFlowCommand,
  duplicateFlowCommand,
} from './commands/flows/index.js';
export {
  deployCommand,
  getDeploymentCommand,
} from './commands/deploy/index.js';
export {
  createDeployCommand,
  listDeploymentsCommand,
  getDeploymentBySlugCommand,
  createDeploymentCommand,
  deleteDeploymentCommand,
} from './commands/deployments/index.js';
export { feedbackCommand } from './commands/feedback/index.js';

// === Programmatic API ===
// High-level functions for library usage
export { bundle, bundleRemote } from './commands/bundle/index.js';
export { simulate } from './commands/simulate/index.js';
export { push } from './commands/push/index.js';
export { run } from './commands/run/index.js';
export { validate } from './commands/validate/index.js';
export { getToken, getAuthHeaders, requireProjectId } from './core/auth.js';
export {
  apiFetch,
  publicFetch,
  deployFetch,
  mergeAuthHeaders,
} from './core/http.js';
export { createApiClient } from './core/api-client.js';
export { ApiError, throwApiError } from './core/api-error.js';
export type { ApiErrorDetail } from './core/api-error.js';
export {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from './commands/projects/index.js';
export { whoami } from './commands/auth/index.js';
export { feedback } from './commands/feedback/index.js';
export {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
} from './commands/flows/index.js';
export { deploy, getDeployment } from './commands/deploy/index.js';
export {
  listDeployments,
  getDeploymentBySlug,
  createDeployment,
  deleteDeployment,
} from './commands/deployments/index.js';
export type { FeedbackOptions } from './commands/feedback/index.js';
export { readConfig, writeConfig } from './lib/config-file.js';
export type { WalkerOSConfig } from './lib/config-file.js';
export type { ListFlowsOptions } from './commands/flows/index.js';
export type { DeployOptions } from './commands/deploy/index.js';
export type { ListDeploymentsOptions } from './commands/deployments/index.js';
export { parseSSEEvents } from './core/sse.js';
export type { SSEEvent, SSEParseResult } from './core/sse.js';

// === Utilities ===
// Export utilities for programmatic usage
export { loadJsonConfig } from './config/utils.js';
export { findExample } from './commands/simulate/example-loader.js';
export { compareOutput } from './commands/simulate/compare.js';

// === Types ===
// Export types for programmatic usage
// Config structure uses Flow.Config and Flow.Settings from @walkeros/core
export type {
  Flow,
  CLIBuildOptions,
  BuildOptions,
  MinifyOptions,
} from './types/bundle.js';
export type { BundleStats } from './commands/bundle/bundler.js';
export type {
  SimulationResult,
  ExampleMatch,
} from './commands/simulate/types.js';
export type { ExampleLookupResult } from './commands/simulate/example-loader.js';
export type { PushResult } from './commands/push/types.js';
export type {
  RunCommandOptions,
  RunOptions,
  RunResult,
} from './commands/run/index.js';
export type { GlobalOptions } from './types/global.js';
export type {
  ValidateResult,
  ValidationType,
  ValidationError,
  ValidationWarning,
} from './commands/validate/types.js';

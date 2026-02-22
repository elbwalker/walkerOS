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

// === Programmatic API ===
// High-level functions for library usage
export { bundle, bundleRemote } from './commands/bundle/index.js';
export { simulate } from './commands/simulate/index.js';
export { push } from './commands/push/index.js';
export { run } from './commands/run/index.js';
export { validate } from './commands/validate/index.js';
export {
  getToken,
  getAuthHeaders,
  requireProjectId,
  resolveBaseUrl,
} from './core/auth.js';
export { createApiClient } from './core/api-client.js';
export {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from './commands/projects/index.js';
export { whoami } from './commands/auth/index.js';
export {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
} from './commands/flows/index.js';
export { deploy, getDeployment } from './commands/deploy/index.js';
export type { ListFlowsOptions } from './commands/flows/index.js';
export type { DeployOptions } from './commands/deploy/index.js';
export { parseSSEEvents } from './core/sse.js';
export type { SSEEvent, SSEParseResult } from './core/sse.js';

// === Types ===
// Export types for programmatic usage
// Config structure uses Flow.Setup and Flow.Config from @walkeros/core
export type {
  Flow,
  CLIBuildOptions,
  BuildOptions,
  MinifyOptions,
} from './types/bundle.js';
export type { BundleStats } from './commands/bundle/bundler.js';
export type { SimulationResult } from './commands/simulate/types.js';
export type { PushResult } from './commands/push/types.js';
export type {
  RunMode,
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

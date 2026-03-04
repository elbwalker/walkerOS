/**
 * Runtime module - Execute pre-built walkerOS flows
 *
 * This module provides runtime execution capabilities for:
 * - Running pre-built flow bundles (collect mode)
 * - Self-hosted runner with heartbeat, polling, and hot-swap
 */

export {
  runFlow,
  loadFlow,
  swapFlow,
  type RuntimeConfig,
  type FlowHandle,
} from './runner';
export {
  resolveBundle,
  type ResolvedBundle,
  type BundleSource,
} from './resolve-bundle';
export { validateEnv, type RunnerEnv } from './env';
export {
  fetchConfig,
  type FetchConfigOptions,
  type ConfigFetchResult,
} from './config-fetcher';
export { writeCache, readCache, readCacheConfig } from './cache';
export {
  createHeartbeat,
  getInstanceId,
  type HeartbeatConfig,
  type HeartbeatHandle,
} from './heartbeat';
export { createPoller, type PollerConfig, type PollerHandle } from './poller';

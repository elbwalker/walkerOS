/**
 * Unified runtime pipeline for walkerOS flows
 *
 * Used by both `walkeros run` (CLI) and Docker containers.
 * Creates health server, loads flow, and optionally enables
 * heartbeat/polling/secrets when API config is provided.
 */

import { writeFileSync } from 'fs';
import fs from 'fs-extra';
import type { Logger } from '@walkeros/core';
import { getTmpPath } from '../../core/tmp.js';
import { createHealthServer } from '../../runtime/health-server.js';
import {
  loadFlow,
  swapFlow,
  type RuntimeConfig,
  type FlowHandle,
} from '../../runtime/runner.js';
import {
  createHeartbeat,
  getInstanceId,
  type HeartbeatHandle,
} from '../../runtime/heartbeat.js';
import { createPoller, type PollerHandle } from '../../runtime/poller.js';
import {
  fetchSecrets,
  SecretsHttpError,
} from '../../runtime/secrets-fetcher.js';
import { writeCache } from '../../runtime/cache.js';
import { VERSION } from '../../version.js';

export interface PipelineOptions {
  bundlePath: string;
  port: number;
  logger: Logger.Instance;
  loggerConfig?: Logger.Config;
  api?: {
    appUrl: string;
    token: string;
    projectId: string;
    flowId: string;
    deploymentId?: string;
    heartbeatIntervalMs: number;
    pollIntervalMs: number;
    cacheDir: string;
    flowName?: string;
    /** Injected bundler function (lazy-loaded by caller to avoid pulling in bundler for pre-built flows) */
    prepareBundleForRun: (
      configPath: string,
      options: { verbose?: boolean; silent?: boolean; flowName?: string },
    ) => Promise<{ bundlePath: string; cleanup: () => Promise<void> }>;
  };
}

/**
 * Run the full pipeline: health server + flow + optional API features.
 * This function never returns (keeps process alive). Shutdown via signals.
 */
export async function runPipeline(options: PipelineOptions): Promise<void> {
  const { bundlePath, port, logger, loggerConfig, api } = options;
  let configVersion: string | undefined;

  // Inject secrets before loading flow
  if (api) {
    await injectSecrets(api, logger);
  }

  logger.info(`walkeros/flow v${VERSION}`);
  logger.info(`Instance: ${getInstanceId()}`);

  // Health server (always on)
  const healthServer = await createHealthServer(port, logger);

  // Load flow
  const runtimeConfig: RuntimeConfig = { port };
  let handle: FlowHandle;
  try {
    handle = await loadFlow(
      bundlePath,
      runtimeConfig,
      logger,
      loggerConfig,
      healthServer,
    );
  } catch (error) {
    await healthServer.close();
    throw error;
  }

  logger.info('Flow running');
  logger.info(`Port: ${port}`);

  // API features (heartbeat + poller)
  let heartbeat: HeartbeatHandle | null = null;
  let poller: PollerHandle | null = null;

  // Track temp files for cleanup on hot-swap and shutdown
  let currentBundleCleanup: (() => Promise<void>) | undefined;
  let currentConfigPath: string | undefined;

  if (api) {
    heartbeat = createHeartbeat(
      {
        appUrl: api.appUrl,
        token: api.token,
        projectId: api.projectId,
        flowId: api.flowId,
        deploymentId: api.deploymentId,
        configVersion,
        intervalMs: api.heartbeatIntervalMs,
        getCounters: () => handle.collector.status,
      },
      logger,
    );
    heartbeat.start();
    logger.info(`Heartbeat: active (every ${api.heartbeatIntervalMs / 1000}s)`);

    poller = createPoller(
      {
        fetchOptions: {
          appUrl: api.appUrl,
          token: api.token,
          projectId: api.projectId,
          flowId: api.flowId,
        },
        intervalMs: api.pollIntervalMs,
        onUpdate: async (content, version) => {
          // Refresh secrets before hot-swap
          try {
            await injectSecrets(api, logger);
          } catch (error) {
            logger.error(
              `Failed to refresh secrets during poll, skipping hot-swap: ${error instanceof Error ? error.message : error}`,
            );
            return;
          }

          const tmpConfigPath = getTmpPath(
            undefined,
            `walkeros-flow-${Date.now()}.json`,
          );
          writeFileSync(
            tmpConfigPath,
            JSON.stringify(content, null, 2),
            'utf-8',
          );

          const newBundleResult = await api.prepareBundleForRun(tmpConfigPath, {
            verbose: false,
            silent: true,
            flowName: api.flowName,
          });

          handle = await swapFlow(
            handle,
            newBundleResult.bundlePath,
            runtimeConfig,
            logger,
            loggerConfig,
            healthServer,
          );

          writeCache(
            api.cacheDir,
            newBundleResult.bundlePath,
            JSON.stringify(content),
            version,
          );
          configVersion = version;
          if (heartbeat) heartbeat.updateConfigVersion(version);

          // Clean up previous temp files
          if (currentBundleCleanup)
            await currentBundleCleanup().catch(() => {});
          if (currentConfigPath)
            await fs.remove(currentConfigPath).catch(() => {});

          // Track new paths
          currentBundleCleanup = newBundleResult.cleanup;
          currentConfigPath = tmpConfigPath;

          logger.info(`Hot-swapped to version ${version}`);
        },
      },
      logger,
    );
    poller.start();
    logger.info(`Polling: active (every ${api.pollIntervalMs / 1000}s)`);
  }

  // Single shutdown orchestrator
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);

    const forceTimer = setTimeout(() => {
      logger.error('Shutdown timed out, forcing exit');
      process.exit(1);
    }, 15000);

    try {
      if (poller) poller.stop();
      if (heartbeat) heartbeat.stop();
      if (handle.collector.command) {
        await handle.collector.command('shutdown');
      }
      await healthServer.close();

      // Clean up temp files
      if (currentBundleCleanup) await currentBundleCleanup().catch(() => {});
      if (currentConfigPath) await fs.remove(currentConfigPath).catch(() => {});

      logger.info('Shutdown complete');
      clearTimeout(forceTimer);
      process.exit(0);
    } catch (error) {
      clearTimeout(forceTimer);
      logger.error(
        `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep process alive
  await new Promise(() => {});
}

async function injectSecrets(
  api: NonNullable<PipelineOptions['api']>,
  logger: Logger.Instance,
): Promise<void> {
  try {
    const secrets = await fetchSecrets({
      appUrl: api.appUrl,
      token: api.token,
      projectId: api.projectId,
      flowId: api.flowId,
    });
    const count = Object.keys(secrets).length;
    if (count > 0) {
      for (const [name, value] of Object.entries(secrets)) {
        process.env[name] = value;
      }
      logger.info(`Injected ${count} secret(s) into environment`);
    }
  } catch (error) {
    if (
      error instanceof SecretsHttpError &&
      (error.status === 401 || error.status === 403)
    ) {
      throw error; // Fatal — token is invalid
    }
    logger.warn(
      `Could not fetch secrets: ${error instanceof Error ? error.message : error}`,
    );
    logger.info('Continuing without secrets (flow may not require them)');
  }
}

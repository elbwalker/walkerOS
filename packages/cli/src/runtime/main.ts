/**
 * Entry point for walkeros/flow Docker container
 * DRY pipeline: env validation → resolve config → bundle → cache → run → heartbeat → poll
 */

import { validateEnv, type RunnerEnv } from './env.js';
import { resolveBundle } from './resolve-bundle.js';
import { loadFlow, swapFlow, type FlowHandle } from './runner.js';
import { runServeMode } from './serve.js';
import { fetchConfig } from './config-fetcher.js';
import { writeCache, readCache } from './cache.js';
import {
  createHeartbeat,
  getInstanceId,
  type HeartbeatHandle,
} from './heartbeat.js';
import { createPoller, type PollerHandle } from './poller.js';
import { createLogger } from '../core/logger.js';
import type { Logger } from '@walkeros/core';
import { VERSION } from '../version.js';
async function lazyPrepareBundleForRun(
  configPath: string,
  options: { verbose?: boolean; silent?: boolean },
): Promise<string> {
  const { prepareBundleForRun } = await import('../commands/run/utils.js');
  return prepareBundleForRun(configPath, options);
}

function isPreBuiltConfig(configPath: string): boolean {
  return (
    configPath.endsWith('.mjs') ||
    configPath.endsWith('.js') ||
    configPath.endsWith('.cjs')
  );
}
import { writeFileSync, readFileSync } from 'fs';
import {
  initStatus,
  setRunning,
  updateLastPoll,
  updateLastHeartbeat,
  updateConfigVersion as updateStatusVersion,
} from './status.js';

/**
 * Adapt CLI logger to @walkeros/core Logger.Instance interface
 */
function adaptLogger(
  cliLogger: ReturnType<typeof createLogger>,
): Logger.Instance {
  return {
    error: (message: string | Error) => {
      cliLogger.error(message instanceof Error ? message.message : message);
    },
    info: (message: string | Error) => {
      cliLogger.info(message instanceof Error ? message.message : message);
    },
    debug: (message: string | Error) => {
      cliLogger.debug(message instanceof Error ? message.message : message);
    },
    throw: (message: string | Error): never => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.error(msg);
      throw message instanceof Error ? message : new Error(msg);
    },
    scope: (_name: string) => adaptLogger(cliLogger),
  };
}

function resolveAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.WALKEROS_APP_URL ||
    'https://app.walkeros.io'
  );
}

async function main() {
  const cliLogger = createLogger({ silent: false, verbose: true });
  const logger = adaptLogger(cliLogger);

  // Step 1: Validate env vars
  let env: RunnerEnv;
  try {
    env = validateEnv(process.env);
  } catch (error) {
    cliLogger.error(
      `Configuration error: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  }

  cliLogger.log(`walkeros/flow v${VERSION} — ${env.mode} mode`);
  cliLogger.log(`Instance: ${getInstanceId()}`);

  // Initialize status tracking
  initStatus({
    mode: env.mode,
    port: env.port,
    configSource: env.remoteConfig ? 'api' : 'local',
    apiEnabled: env.apiEnabled,
  });

  // Step 2: Serve mode is simple — no bundling, no polling
  if (env.mode === 'serve') {
    setRunning();
    await runServeMode({ port: env.port, file: env.bundlePath }, logger);
    return;
  }

  // Step 3: Resolve config (local file or API fetch)
  let configPath: string | null = null;
  let configVersion: string | undefined;

  if (env.remoteConfig) {
    // Mode C/D: Fetch from API
    cliLogger.log('Fetching config from API...');
    try {
      const result = await fetchConfig({
        appUrl: resolveAppUrl(),
        token: env.token!,
        projectId: env.projectId!,
        flowId: env.flowId!,
      });
      if (result.changed) {
        const tmpConfigPath = `/tmp/walkeros-flow-${Date.now()}.json`;
        writeFileSync(
          tmpConfigPath,
          JSON.stringify(result.content, null, 2),
          'utf-8',
        );
        configPath = tmpConfigPath;
        configVersion = result.version;
        cliLogger.log(`Config version: ${result.version}`);
      }
    } catch (error) {
      cliLogger.error(
        `API fetch failed: ${error instanceof Error ? error.message : error}`,
      );

      // Fallback to cache
      const cached = readCache(env.cacheDir);
      if (cached) {
        cliLogger.log(`Using cached bundle (version: ${cached.version})`);
        await runWithBundle(
          cached.bundlePath,
          env,
          logger,
          cliLogger,
          cached.version,
        );
        return;
      }

      cliLogger.error('No cached bundle available. Cannot start.');
      process.exit(1);
    }
  } else {
    // Mode A/B: Use local bundle
    const resolved = await resolveBundle(env.bundlePath);
    if (resolved.source === 'stdin') {
      cliLogger.log('Bundle: received via stdin');
    } else if (resolved.source === 'url') {
      cliLogger.log('Bundle: fetched from URL');
    } else {
      cliLogger.log(`Bundle: ${resolved.path}`);
    }

    // Pre-built bundles skip bundling step
    if (isPreBuiltConfig(resolved.path)) {
      await runWithBundle(resolved.path, env, logger, cliLogger, undefined);
      return;
    }
    configPath = resolved.path;
  }

  // Step 4: Bundle the config
  if (!configPath) {
    cliLogger.error('No config resolved');
    process.exit(1);
  }

  cliLogger.log('Building flow...');
  let bundlePath: string;
  try {
    bundlePath = await lazyPrepareBundleForRun(configPath, {
      verbose: false,
      silent: true,
    });
  } catch (error) {
    cliLogger.error(
      `Bundle failed: ${error instanceof Error ? error.message : error}`,
    );

    // Fallback to cache for remote config
    if (env.remoteConfig) {
      const cached = readCache(env.cacheDir);
      if (cached) {
        cliLogger.log(`Using cached bundle (version: ${cached.version})`);
        await runWithBundle(
          cached.bundlePath,
          env,
          logger,
          cliLogger,
          cached.version,
        );
        return;
      }
    }

    process.exit(1);
  }

  cliLogger.log('Bundle ready');

  // Step 5: Cache the working bundle
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    writeCache(
      env.cacheDir,
      bundlePath,
      configContent,
      configVersion || 'local',
    );
  } catch {
    cliLogger.debug('Cache write failed (non-critical)');
  }

  // Step 6: Run
  await runWithBundle(bundlePath, env, logger, cliLogger, configVersion);
}

async function runWithBundle(
  bundlePath: string,
  env: RunnerEnv,
  logger: Logger.Instance,
  cliLogger: ReturnType<typeof createLogger>,
  configVersion: string | undefined,
) {
  // Load and start the flow
  let handle: FlowHandle;
  try {
    handle = await loadFlow(bundlePath, { port: env.port }, logger);
  } catch (error) {
    cliLogger.error(
      `Failed to load flow: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  }

  setRunning();
  cliLogger.log('Flow running');
  cliLogger.log(`Port: ${env.port}`);

  // Track handles for shutdown
  let heartbeat: HeartbeatHandle | null = null;
  let poller: PollerHandle | null = null;

  // Step 7: Start heartbeat (if API enabled, uses HEARTBEAT_INTERVAL)
  if (env.apiEnabled) {
    heartbeat = createHeartbeat(
      {
        appUrl: resolveAppUrl(),
        token: env.token!,
        projectId: env.projectId!,
        flowId: env.flowId,
        configVersion,
        mode: env.mode,
        intervalMs: env.heartbeatInterval * 1000,
      },
      logger,
    );
    heartbeat.start();
    cliLogger.log(`Heartbeat: active (every ${env.heartbeatInterval}s)`);
  }

  // Step 8: Start poller (if remote config, uses POLL_INTERVAL)
  if (env.remoteConfig) {
    poller = createPoller(
      {
        fetchOptions: {
          appUrl: resolveAppUrl(),
          token: env.token!,
          projectId: env.projectId!,
          flowId: env.flowId!,
        },
        intervalMs: env.pollInterval * 1000,
        onUpdate: async (content, version) => {
          // Unique temp path per update — prevents race conditions
          const tmpConfigPath = `/tmp/walkeros-flow-${Date.now()}.json`;
          writeFileSync(
            tmpConfigPath,
            JSON.stringify(content, null, 2),
            'utf-8',
          );

          const newBundle = await lazyPrepareBundleForRun(tmpConfigPath, {
            verbose: false,
            silent: true,
          });

          handle = await swapFlow(
            handle,
            newBundle,
            { port: env.port },
            logger,
          );

          // Update cache
          writeCache(env.cacheDir, newBundle, JSON.stringify(content), version);
          configVersion = version;

          // Update heartbeat config version
          if (heartbeat) heartbeat.updateConfigVersion(version);

          // Update status tracking
          updateStatusVersion(version);
          updateLastPoll();

          cliLogger.log(`Hot-swapped to version ${version}`);
        },
      },
      logger,
    );
    poller.start();
    cliLogger.log(`Polling: active (every ${env.pollInterval}s)`);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    cliLogger.log(`Received ${signal}, shutting down...`);
    if (poller) poller.stop();
    if (heartbeat) heartbeat.stop();
    try {
      if (handle.collector.command) {
        await handle.collector.command('shutdown');
      }
    } catch {
      /* best-effort */
    }
    cliLogger.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep alive
  await new Promise(() => {});
}

main();

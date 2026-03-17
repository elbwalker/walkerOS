/**
 * Run Command
 *
 * Unified entry point for running walkerOS flows.
 * Used by both `walkeros run` (CLI) and Docker containers.
 */

import path from 'path';
import { writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createCLILogger } from '../../core/cli-logger.js';
import { createTimer, getErrorMessage } from '../../core/index.js';
import { resolveAppUrl } from '../../lib/config-file.js';
import { resolveRunToken } from '../../core/auth.js';
import { resolveBundle } from '../../runtime/resolve-bundle.js';
import { fetchConfig } from '../../runtime/config-fetcher.js';
import { readCache } from '../../runtime/cache.js';
import { validateFlowFile, validatePort } from './validators.js';
import { isPreBuiltConfig } from './utils.js';
import { runPipeline, type PipelineOptions } from './pipeline.js';
import type { RunCommandOptions, RunOptions, RunResult } from './types.js';

/** Default cache dir following XDG conventions */
function defaultCacheDir(): string {
  const xdgCache = process.env.XDG_CACHE_HOME;
  const base = xdgCache || join(homedir(), '.cache');
  return join(base, 'walkeros');
}

/** Lazy-load bundler to avoid pulling it in for pre-built flows */
async function lazyPrepareBundleForRun(
  configPath: string,
  options: { verbose?: boolean; silent?: boolean; flowName?: string },
): Promise<string> {
  const { prepareBundleForRun } = await import('./utils.js');
  return prepareBundleForRun(configPath, options);
}

/**
 * CLI command function for `walkeros run`
 */
export async function runCommand(options: RunCommandOptions): Promise<void> {
  const timer = createTimer();
  timer.start();

  const logger = createCLILogger(options);

  try {
    // Resolve port
    const port = options.port ?? 8080;
    if (options.port !== undefined) {
      validatePort(options.port);
    }

    // Resolve API config
    const flowId = options.flowId;
    const projectId = options.project;
    const token = resolveRunToken();
    const appUrl = resolveAppUrl();
    const flowName = options.flow;

    let apiConfig: PipelineOptions['api'] | undefined;

    if (flowId) {
      if (!token) {
        logger.error(
          `Remote flow requires authentication.\n\n` +
            `  No token found. Authenticate first:\n` +
            `    $ walkeros auth login\n\n` +
            `  Or set WALKEROS_TOKEN:\n` +
            `    $ export WALKEROS_TOKEN=<your-token>`,
        );
        process.exit(1);
      }
      if (!projectId) {
        logger.error(
          `--flow-id requires --project or WALKEROS_PROJECT_ID.\n\n` +
            `  Set the project:\n` +
            `    $ walkeros run --flow-id ${flowId} --project <your-project-id>\n` +
            `    $ export WALKEROS_PROJECT_ID=<your-project-id>`,
        );
        process.exit(1);
      }

      apiConfig = {
        appUrl,
        token,
        projectId,
        flowId,
        heartbeatIntervalMs:
          parseInt(
            process.env.WALKEROS_HEARTBEAT_INTERVAL ??
              process.env.HEARTBEAT_INTERVAL ??
              '60',
            10,
          ) * 1000,
        pollIntervalMs:
          parseInt(
            process.env.WALKEROS_POLL_INTERVAL ??
              process.env.POLL_INTERVAL ??
              '30',
            10,
          ) * 1000,
        cacheDir:
          process.env.WALKEROS_CACHE_DIR ??
          process.env.CACHE_DIR ??
          defaultCacheDir(),
        flowName,
        prepareBundleForRun: lazyPrepareBundleForRun,
      };
    }

    // Resolve bundle path
    const bundlePath = await resolveBundlePath(
      options.config,
      apiConfig,
      logger,
    );

    // Run pipeline
    logger.info('Starting flow...');
    await runPipeline({
      bundlePath,
      port,
      logger: logger.scope('runner'),
      loggerConfig: options.verbose ? { level: 0 } : undefined,
      api: apiConfig,
    });
  } catch (error) {
    const duration = timer.getElapsed() / 1000;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      logger.json({
        success: false,
        error: errorMessage,
        duration,
      });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }
    process.exit(1);
  }
}

/**
 * Resolve the bundle path from local file, remote API, or cache.
 *
 * Priority:
 * 1. Local file (provided via CLI arg or BUNDLE env)
 * 2. Remote config fetch (when apiConfig is provided and no local file)
 * 3. Cached bundle (fallback when remote fetch fails)
 */
async function resolveBundlePath(
  configInput: string | undefined,
  apiConfig: PipelineOptions['api'] | undefined,
  logger: ReturnType<typeof createCLILogger>,
): Promise<string> {
  // Case 1: Local file or URL bundle
  if (configInput) {
    const resolved = await resolveBundle(configInput);

    if (resolved.source === 'stdin') {
      logger.info('Bundle: received via stdin');
    } else if (resolved.source === 'url') {
      logger.info('Bundle: fetched from URL');
    } else {
      logger.info(`Bundle: ${resolved.path}`);
    }

    if (isPreBuiltConfig(resolved.path)) {
      return path.resolve(resolved.path);
    }

    // JSON config — needs bundling
    const flowFile = validateFlowFile(resolved.path);
    logger.debug('Building flow bundle');
    return lazyPrepareBundleForRun(flowFile, {
      verbose: false,
      silent: true,
      flowName: apiConfig?.flowName,
    });
  }

  // Case 2: Remote config fetch (no local file, but API config with flowId)
  if (apiConfig) {
    logger.info('Fetching config from API...');
    try {
      const result = await fetchConfig({
        appUrl: apiConfig.appUrl,
        token: apiConfig.token,
        projectId: apiConfig.projectId,
        flowId: apiConfig.flowId,
      });

      if (result.changed) {
        const tmpConfigPath = `/tmp/walkeros-flow-${Date.now()}.json`;
        writeFileSync(
          tmpConfigPath,
          JSON.stringify(result.content, null, 2),
          'utf-8',
        );
        logger.info(`Config version: ${result.version}`);

        logger.info('Building flow...');
        const bundlePath = await lazyPrepareBundleForRun(tmpConfigPath, {
          verbose: false,
          silent: true,
          flowName: apiConfig.flowName,
        });

        // Cache the working bundle
        try {
          const { writeCache } = await import('../../runtime/cache.js');
          writeCache(
            apiConfig.cacheDir,
            bundlePath,
            JSON.stringify(result.content),
            result.version,
          );
        } catch {
          logger.debug('Cache write failed (non-critical)');
        }

        return bundlePath;
      }
    } catch (error) {
      logger.error(
        `API fetch failed: ${error instanceof Error ? error.message : error}`,
      );

      // Fallback to cache
      const cached = readCache(apiConfig.cacheDir);
      if (cached) {
        logger.info(`Using cached bundle (version: ${cached.version})`);
        return cached.bundlePath;
      }

      throw new Error(
        'No config available. API fetch failed and no cached bundle.',
      );
    }
  }

  // Case 3: Default — look for server-collect.mjs
  const defaultFile = 'server-collect.mjs';
  logger.debug(`No config specified, using default: ${defaultFile}`);
  return path.resolve(defaultFile);
}

/**
 * Programmatic run function
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const startTime = Date.now();

  try {
    await runCommand({
      config: options.config,
      port: options.port,
      flow: options.flow,
      flowId: options.flowId,
      project: options.project,
      verbose: options.verbose,
      silent: options.silent ?? true,
    });

    return {
      success: true,
      exitCode: 0,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  }
}

export type { RunCommandOptions, RunOptions, RunResult };

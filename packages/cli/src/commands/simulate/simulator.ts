import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import { createLogger, getErrorMessage } from '../../core/index.js';
import {
  loadJsonConfig,
  loadBundleConfig,
  getTempDir,
  isObject,
  type BuildOptions,
} from '../../config/index.js';
import { bundleCore } from '../bundle/bundler.js';
import { downloadPackages } from '../bundle/package-manager.js';
import { CallTracker } from './tracker.js';
import { executeInJSDOM } from './jsdom-executor.js';
import { loadDestinationEnvs } from './env-loader.js';
import type { SimulateCommandOptions, SimulationResult } from './types.js';

/**
 * Generate a unique ID for temp files
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Main simulation orchestrator
 */
export async function simulateCore(
  configPath: string,
  event: unknown,
  options: Pick<SimulateCommandOptions, 'json' | 'verbose' | 'silent'> = {},
): Promise<SimulationResult> {
  const logger = createLogger({
    verbose: options.verbose || false,
    silent: options.silent || false,
    json: options.json || false,
  });

  try {
    logger.info('🎯 Starting walkerOS simulation...');

    // Load and validate configuration
    logger.info('📦 Loading bundle configuration...');
    const fullConfigPath = path.resolve(configPath);
    const rawConfig = await loadJsonConfig(fullConfigPath);
    loadBundleConfig(rawConfig, { configPath: fullConfigPath });

    // Execute simulation
    logger.info(`🚀 Executing simulation with event: ${JSON.stringify(event)}`);
    const result = await executeSimulation(event, fullConfigPath);

    // Report results
    if (result.success) {
      logger.info(`✅ Simulation completed successfully`);
    } else {
      logger.error(`❌ Simulation failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(`💥 Simulation error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Simple result formatting
 */
export function formatSimulationResult(
  result: SimulationResult,
  options: Pick<SimulateCommandOptions, 'json'> = {},
): string {
  if (options.json) {
    const output = {
      result: result.elbResult,
      usage: result.usage,
      duration: result.duration,
    };
    return JSON.stringify(output, null, 2);
  }

  if (result.success) {
    return '✅ Simulation completed successfully';
  } else {
    return `❌ Simulation failed: ${result.error}`;
  }
}

/**
 * Execute simulation using destination-provided mock environments
 */
export async function executeSimulation(
  event: unknown,
  configPath: string,
): Promise<SimulationResult> {
  const startTime = Date.now();
  let bundlePath: string | undefined;
  const tempDir = getTempDir();

  try {
    // Validate event format
    if (
      !isObject(event) ||
      !('name' in event) ||
      typeof event.name !== 'string'
    ) {
      throw new Error(
        'Event must be an object with a "name" property of type string',
      );
    }

    const typedEvent = event as { name: string; data?: unknown };

    // Ensure temp directory exists
    await fs.ensureDir(tempDir);

    // 1. Load config
    const rawConfig = await loadJsonConfig(configPath);
    const { flowConfig, buildOptions } = loadBundleConfig(rawConfig, {
      configPath,
    });

    // 2. Download packages to temp directory
    // This ensures we use clean npm packages, not workspace packages
    const packagesArray = Object.entries(buildOptions.packages).map(
      ([name, packageConfig]) => ({
        name,
        version:
          (typeof packageConfig === 'object' &&
          packageConfig !== null &&
          'version' in packageConfig &&
          typeof packageConfig.version === 'string'
            ? packageConfig.version
            : undefined) || 'latest',
      }),
    );
    const packagePaths = await downloadPackages(
      packagesArray,
      tempDir, // downloadPackages will add 'node_modules' subdirectory itself
      createLogger({ silent: true }),
      buildOptions.cache,
    );

    // 3. Create tracker
    const tracker = new CallTracker();

    // 4. Create temporary bundle as production IIFE (not ESM!)
    const tempOutput = path.join(
      tempDir,
      `simulation-bundle-${generateId()}.js`,
    );

    const destinations = (
      flowConfig as unknown as { destinations?: Record<string, unknown> }
    ).destinations;

    // Create build options for simulation - bundle as IIFE to test actual production code
    const simulationBuildOptions: BuildOptions = {
      ...buildOptions,
      code: buildOptions.code || '', // No code modification - use original
      output: tempOutput,
      tempDir, // Use same temp dir for bundle
      format: 'iife' as const, // ← Test actual production format!
      platform: 'browser' as const, // ← Browser platform for IIFE
      windowCollector: 'collector', // ← Ensure window assignment
      windowElb: 'elb',
    };

    // 5. Bundle with downloaded packages (they're already in tempDir/node_modules)
    await bundleCore(
      flowConfig,
      simulationBuildOptions,
      createLogger({ silent: true }),
      false,
    );
    bundlePath = tempOutput;

    // 6. Load env examples dynamically from destination packages
    const envs = await loadDestinationEnvs(destinations || {});

    // 7. Execute IIFE in JSDOM with env-based mocking
    const result = await executeInJSDOM(
      tempOutput,
      destinations || {},
      typedEvent,
      tracker,
      envs, // Pass dynamically loaded envs
      10000, // 10s timeout
    );

    const elbResult = result.elbResult;
    const usage = result.usage;

    const duration = Date.now() - startTime;

    return {
      success: true,
      elbResult,
      usage,
      duration,
      logs: [],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: getErrorMessage(error),
      duration,
    };
  } finally {
    // Cleanup temp directory and all its contents
    if (tempDir) {
      await fs.remove(tempDir).catch(() => {
        // Ignore cleanup errors - temp dirs will be cleaned eventually
      });
    }
    // Note: JSDOM automatically cleans up its own isolated environment
  }
}

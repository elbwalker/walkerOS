import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import { getPlatform } from '@walkeros/core';
import { createLogger, getErrorMessage } from '../../core/index.js';
import {
  loadFlowConfig,
  isObject,
  type BuildOptions,
} from '../../config/index.js';
import { getTmpPath } from '../../core/tmp.js';
import { bundleCore } from '../bundle/bundler.js';
import { CallTracker } from './tracker.js';
import { executeInJSDOM } from './jsdom-executor.js';
import { executeInNode } from './node-executor.js';
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
    // Load and validate configuration
    logger.debug('Loading configuration');
    await loadFlowConfig(configPath);

    // Execute simulation
    logger.debug(`Simulating event: ${JSON.stringify(event)}`);
    const result = await executeSimulation(event, configPath);

    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);

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
    return 'Simulation completed';
  } else {
    return `Simulation failed: ${result.error}`;
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
  const tempDir = getTmpPath();

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
    const { flowConfig, buildOptions } = await loadFlowConfig(configPath);

    // Detect platform from flowConfig
    const platform = getPlatform(flowConfig);

    // 2. Create tracker
    const tracker = new CallTracker();

    // 3. Create temporary bundle
    const tempOutput = path.join(
      tempDir,
      `simulation-bundle-${generateId()}.${platform === 'web' ? 'js' : 'mjs'}`,
    );

    const destinations = (
      flowConfig as unknown as { destinations?: Record<string, unknown> }
    ).destinations;

    // Create build options for simulation - platform-aware bundling
    const simulationBuildOptions: BuildOptions = {
      ...buildOptions,
      code: buildOptions.code || '',
      output: tempOutput,
      tempDir,
      ...(platform === 'web'
        ? {
            format: 'iife' as const,
            platform: 'browser' as const,
            windowCollector: 'collector',
            windowElb: 'elb',
          }
        : {
            format: 'esm' as const,
            platform: 'node' as const,
          }),
    };

    // 4. Bundle (downloads packages internally)
    await bundleCore(
      flowConfig,
      simulationBuildOptions,
      createLogger({ silent: true }),
      false,
    );
    bundlePath = tempOutput;

    // 5. Load env examples dynamically from destination packages
    const envs = await loadDestinationEnvs(destinations || {});

    // 6. Execute based on platform
    let result;
    if (platform === 'web') {
      result = await executeInJSDOM(
        tempOutput,
        destinations || {},
        typedEvent,
        tracker,
        envs,
        10000,
      );
    } else {
      result = await executeInNode(
        tempOutput,
        destinations || {},
        typedEvent,
        tracker,
        envs,
        30000,
      );
    }

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

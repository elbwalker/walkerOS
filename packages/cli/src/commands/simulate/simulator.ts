import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import { getPlatform } from '@walkeros/core';
import {
  createLogger,
  getErrorMessage,
  detectInput,
  type Platform,
} from '../../core/index.js';
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
  inputPath: string,
  event: unknown,
  options: Pick<
    SimulateCommandOptions,
    'json' | 'verbose' | 'silent' | 'platform'
  > = {},
): Promise<SimulationResult> {
  const logger = createLogger({
    verbose: options.verbose || false,
    silent: options.silent || false,
    json: options.json || false,
  });

  try {
    // Execute simulation
    logger.debug(`Simulating event: ${JSON.stringify(event)}`);
    const result = await executeSimulation(event, inputPath, options.platform);

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
 * Execute simulation using destination-provided mock environments.
 * Supports both config JSON and pre-built bundle inputs.
 */
export async function executeSimulation(
  event: unknown,
  inputPath: string,
  platformOverride?: Platform,
): Promise<SimulationResult> {
  const startTime = Date.now();
  const tempDir = getTmpPath();

  try {
    // Ensure temp directory exists
    await fs.ensureDir(tempDir);

    // Detect input type first (so file errors appear before event validation errors)
    const detected = await detectInput(inputPath, platformOverride);

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

    if (detected.type === 'config') {
      // Config flow: load config, bundle, execute with mocking
      return await executeConfigSimulation(
        detected.content,
        inputPath,
        typedEvent,
        tempDir,
        startTime,
      );
    } else {
      // Bundle flow: execute directly without mocking
      return await executeBundleSimulation(
        detected.content,
        detected.platform!,
        typedEvent,
        tempDir,
        startTime,
      );
    }
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
  }
}

/**
 * Execute simulation from config JSON (existing behavior with mocking)
 */
async function executeConfigSimulation(
  _content: string,
  configPath: string,
  typedEvent: { name: string; data?: unknown },
  tempDir: string,
  startTime: number,
): Promise<SimulationResult> {
  // Load config
  const { flowConfig, buildOptions } = await loadFlowConfig(configPath);

  // Detect platform from flowConfig
  const platform = getPlatform(flowConfig);

  // Create tracker
  const tracker = new CallTracker();

  // Create temporary bundle
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

  // Bundle (downloads packages internally)
  await bundleCore(
    flowConfig,
    simulationBuildOptions,
    createLogger({ silent: true }),
    false,
  );

  // Load env examples dynamically from destination packages
  const envs = await loadDestinationEnvs(destinations || {});

  // Execute based on platform
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

  const duration = Date.now() - startTime;

  return {
    success: true,
    elbResult: result.elbResult,
    usage: result.usage,
    duration,
    logs: [],
  };
}

/**
 * Execute simulation from pre-built bundle (no mocking)
 */
async function executeBundleSimulation(
  bundleContent: string,
  platform: Platform,
  typedEvent: { name: string; data?: unknown },
  tempDir: string,
  startTime: number,
): Promise<SimulationResult> {
  // Write bundle to temp file
  const tempOutput = path.join(
    tempDir,
    `bundle-${generateId()}.${platform === 'server' ? 'mjs' : 'js'}`,
  );
  await fs.writeFile(tempOutput, bundleContent, 'utf8');

  // Create empty tracker (no mocking for pre-built bundles)
  const tracker = new CallTracker();

  // Execute based on platform (no destinations/envs for pre-built bundles)
  let result;
  if (platform === 'web') {
    result = await executeInJSDOM(
      tempOutput,
      {},
      typedEvent,
      tracker,
      {},
      10000,
    );
  } else {
    result = await executeInNode(
      tempOutput,
      {},
      typedEvent,
      tracker,
      {},
      30000,
    );
  }

  const duration = Date.now() - startTime;

  return {
    success: true,
    elbResult: result.elbResult,
    usage: result.usage,
    duration,
    logs: [],
  };
}

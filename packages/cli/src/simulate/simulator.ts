import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { loadJsonConfig, createLogger, getTempDir, isObject } from '../core';
import { parseBundleConfig, type BundleConfig } from '../bundle/config';
import { bundle } from '../bundle/bundler';
import type { SimulateCommandOptions, SimulationResult } from './types';
import type { WalkerOS } from '@walkeros/core';

/**
 * Generate a unique ID for temp files (lightweight alternative to getId)
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Main simulation orchestrator
 */
export async function simulate(
  configPath: string,
  event: unknown,
  options: Pick<SimulateCommandOptions, 'json' | 'verbose'> = {},
): Promise<SimulationResult> {
  const logger = createLogger({
    verbose: options.verbose || false,
    silent: false,
    json: options.json || false,
  });

  try {
    logger.info('🎯 Starting walkerOS simulation...');

    // Step 1: Load and parse configuration (for future use)
    logger.info('📦 Loading bundle configuration...');
    const fullConfigPath = path.resolve(configPath);
    const rawConfig = await loadJsonConfig(fullConfigPath);
    parseBundleConfig(rawConfig); // Validate config format

    // Step 2: Execute simulation
    logger.info(`🚀 Executing simulation with event: ${event}`);
    const result = await executeSimulation(event, fullConfigPath);

    // Step 3: Report results
    if (result.success) {
      logger.info(`✅ Simulation completed successfully`);
    } else {
      logger.error(`❌ Simulation failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`💥 Simulation error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Parse event input - handles both strings and JSON objects
 */
export function parseEventInput(eventString: string = ''): unknown {
  if (!eventString) {
    return {};
  }

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(eventString);
    return isObject(parsed) ? parsed : {};
  } catch {
    // If JSON parsing fails, treat as event name string
    return { name: eventString };
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
 * Generate simulation bundle using simulation template
 * This creates an ESM bundle with API tracking built-in
 */
async function generateSimulationBundle(
  config: BundleConfig,
  silent = false,
): Promise<string> {
  // Create a logger for bundle generation - silent in JSON mode
  const logger = createLogger({ silent });

  // Create temporary bundle
  const tempDir = getTempDir();
  const tempOutput = path.join(
    tempDir,
    `simulation-bundle-${generateId()}.mjs`,
  );

  // Use simulation template (has tracking built-in)
  // In ESM, __dirname is not available, so we use import.meta.url
  const __filename = new URL(import.meta.url).pathname;
  const __dirname = path.dirname(__filename);
  // From dist/index.mjs, go up one level to get to package root
  const packageRoot = path.resolve(__dirname, '..');
  const simulationTemplate = path.join(packageRoot, 'templates/simulation.hbs');

  const tempConfig = {
    ...config,
    template: simulationTemplate,
    build: {
      ...config.build,
      format: 'esm' as const, // ESM for dynamic import()
    },
    output: tempOutput,
  };

  try {
    // Generate bundle
    await bundle(tempConfig, logger, false);

    // Return the path to the bundle (not the code itself)
    return tempOutput;
  } catch (error) {
    // Cleanup on error
    await fs.remove(tempDir).catch(() => {});
    throw error;
  }
}

/**
 * Execute simulation using ESM import with tracking
 */
export async function executeSimulation(
  event: unknown,
  configPath: string,
): Promise<SimulationResult> {
  const startTime = Date.now();
  let bundlePath: string | undefined;

  try {
    // Generate real bundle from config
    const rawConfig = await loadJsonConfig(configPath);
    const config = parseBundleConfig(rawConfig);

    // Create simulation bundle (ESM with tracking built-in)
    bundlePath = await generateSimulationBundle(config, true);

    // Dynamic import with cache busting
    const timestamp = Date.now();
    const moduleUrl = `file://${bundlePath}?t=${timestamp}`;

    // Import the ESM bundle
    const module = await import(moduleUrl);

    // The simulation template exports { flow, vmUsage } wrapped in a Promise
    const { flow, vmUsage } = await module.default;

    if (!flow || typeof flow.elb !== 'function') {
      throw new Error(
        'Bundle did not export valid flow object with elb function',
      );
    }

    // Execute the event
    const elbResult = await flow.elb(event);

    const duration = Date.now() - startTime;

    return {
      success: true,
      elbResult,
      usage: vmUsage || {},
      duration,
      logs: [],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  } finally {
    // Cleanup temp bundle file
    if (bundlePath) {
      await fs.remove(path.dirname(bundlePath)).catch(() => {});
    }
  }
}

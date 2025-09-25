import path from 'path';
import { isObject } from '@walkeros/core';
import { loadJsonConfig, createLogger } from '../core';
import { parseBundleConfig } from '../bundle/config';
import { executeSimulation } from './loader';
import type { SimulateCommandOptions, SimulationResult } from './types';
import type { WalkerOS } from '@walkeros/core';

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
    const result = await executeSimulation(event);

    // Step 3: Report results
    if (result.success) {
      logger.info(`✅ Simulation completed successfully`);
    } else {
      logger.error(`❌ Simulation failed: ${result.error}`);
    }

    return {
      success: result.success,
      error: result.error,
    };
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
 * Simple event parsing - just parse JSON
 */
export function parseEventInput(eventString: string = ''): unknown {
  const event = JSON.parse(eventString);

  return isObject(event) ? event : {};
}

/**
 * Simple result formatting
 */
export function formatSimulationResult(
  result: SimulationResult,
  options: Pick<SimulateCommandOptions, 'json'> = {},
): string {
  if (options.json) {
    return JSON.stringify(result, null, 2);
  }

  if (result.success) {
    return '✅ Simulation completed successfully';
  } else {
    return `❌ Simulation failed: ${result.error}`;
  }
}

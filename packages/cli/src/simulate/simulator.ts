import path from 'path';
import {
  loadJsonConfig,
  createLogger,
  createJsonOutput,
  formatDuration,
} from '../core';
import { parseBundleConfig } from '../bundle/config';
import { executeSimulation } from './loader';
import type { SimulateCommandOptions, SimulationResult } from './types';
import type { WalkerOS } from '@walkeros/core';

/**
 * Main simulation orchestrator
 */
export async function simulate(
  configPath: string,
  event: WalkerOS.Event,
  options: Pick<SimulateCommandOptions, 'json' | 'verbose'> = {},
): Promise<SimulationResult> {
  const logger = createLogger({
    verbose: options.verbose || false,
    silent: false,
    json: options.json || false,
  });

  try {
    logger.info('🎯 Starting walkerOS simulation...');

    // Step 1: Load and parse configuration
    logger.info('📦 Loading bundle configuration...');
    const fullConfigPath = path.resolve(configPath);
    const rawConfig = await loadJsonConfig(fullConfigPath);
    const config = parseBundleConfig(rawConfig);

    // Step 2: Execute simulation
    logger.info(`🚀 Executing simulation with event: ${event.name}`);
    const result = await executeSimulation(config, event, logger);

    // Step 3: Report results
    if (result.success) {
      logger.info(`✅ Simulation completed in ${result.duration}ms`);
      logger.info(`📊 Captured ${result.calls.length} API calls`);
    } else {
      logger.error(`❌ Simulation failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`💥 Simulation error: ${errorMessage}`);

    return {
      event,
      calls: [],
      success: false,
      error: errorMessage,
      duration: 0,
    };
  }
}

/**
 * Parses event from JSON string or creates default event
 */
export function parseEventInput(eventString?: string): WalkerOS.Event {
  if (!eventString) {
    // Default test event - only provide required fields
    return {
      name: 'page view',
      data: {},
    } as WalkerOS.Event;
  }

  try {
    const parsed = JSON.parse(eventString);

    // Validate basic event structure
    if (typeof parsed !== 'object' || !parsed.name) {
      throw new Error('Event must be an object with a "name" property');
    }

    // Ensure name follows "entity action" format
    if (typeof parsed.name !== 'string' || !parsed.name.includes(' ')) {
      throw new Error(
        'Event name must follow "entity action" format (e.g., "page view")',
      );
    }

    return {
      name: parsed.name,
      data: parsed.data || {},
      context: parsed.context,
      globals: parsed.globals,
      user: parsed.user,
      nested: parsed.nested,
      consent: parsed.consent,
    } as WalkerOS.Event;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in event parameter: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Formats simulation result for output
 */
export function formatSimulationResult(
  result: SimulationResult,
  options: Pick<SimulateCommandOptions, 'json'> = {},
): string {
  if (options.json) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];

  lines.push(`📋 Simulation Results`);
  lines.push(`   Event: ${result.event.name}`);
  lines.push(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
  lines.push(`   Duration: ${result.duration}ms`);

  if (result.error) {
    lines.push(`   Error: ${result.error}`);
  }

  lines.push(`   API Calls: ${result.calls.length}`);

  if (result.calls.length > 0) {
    lines.push('');
    lines.push('🔍 Captured API Calls:');

    result.calls.forEach((call, index) => {
      lines.push(`   ${index + 1}. ${call.path}`);
      if (call.args.length > 0) {
        lines.push(`      Args: ${JSON.stringify(call.args)}`);
      }
    });
  }

  return lines.join('\n');
}

import {
  simulateCore,
  parseEventInput,
  formatSimulationResult,
} from './simulator';
import { createLogger } from '../core';
import type { SimulateCommandOptions } from './types';

/**
 * CLI command handler for simulate command
 */
export async function simulateCommand(
  options: SimulateCommandOptions,
): Promise<void> {
  const startTime = Date.now();

  try {
    // Parse event input
    const event = parseEventInput(options.event);

    // Execute simulation
    const result = await simulateCore(options.config, event, {
      json: options.json,
      verbose: options.verbose,
    });

    // Add duration to result
    const resultWithDuration = {
      ...result,
      duration: (Date.now() - startTime) / 1000,
    };

    // Output results - create output logger that always logs
    const outputLogger = createLogger({ silent: false, json: false });
    const output = formatSimulationResult(resultWithDuration, {
      json: options.json,
    });
    outputLogger.log('white', output);

    // Exit with error code if simulation failed
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (options.json) {
      // JSON error output - create output logger that always logs
      const outputLogger = createLogger({ silent: false, json: false });
      const errorOutput = JSON.stringify(
        {
          success: false,
          error: errorMessage,
          duration: (Date.now() - startTime) / 1000,
        },
        null,
        2,
      );
      outputLogger.log('white', errorOutput);
    } else {
      // Error output - create error logger that always logs
      const errorLogger = createLogger({ silent: false, json: false });
      errorLogger.error(`❌ Simulate command failed: ${errorMessage}`);
    }

    process.exit(1);
  }
}

/**
 * High-level simulate function for programmatic usage.
 *
 * Handles configuration loading internally and returns structured results.
 *
 * @param configOrPath - Bundle configuration object or path to config file
 * @param event - Event object to simulate
 * @param options - Simulation options
 * @param options.silent - Suppress all output (default: false)
 * @param options.verbose - Enable verbose logging (default: false)
 * @param options.json - Format output as JSON (default: false)
 * @returns Simulation result with success status, elb result, and usage data
 *
 * @example
 * ```typescript
 * // With config file
 * const result = await simulate('./walker.config.json', {
 *   name: 'page view',
 *   data: { title: 'Home Page', path: '/', url: 'https://example.com' }
 * });
 *
 * // With config object
 * const result = await simulate(
 *   {
 *     platform: 'web',
 *     packages: { '@walkeros/collector': { imports: ['startFlow'] } },
 *     code: '...',
 *     output: './bundle.js'
 *   },
 *   { name: 'page view' },
 *   { silent: true }
 * );
 * ```
 */
export async function simulate(
  configOrPath: string | unknown,
  event: unknown,
  options: {
    silent?: boolean;
    verbose?: boolean;
    json?: boolean;
  } = {},
): Promise<import('./types').SimulationResult> {
  // simulateCore currently only accepts file paths, so we need to handle that
  // For now, if configOrPath is not a string, throw an error with guidance
  if (typeof configOrPath !== 'string') {
    throw new Error(
      'simulate() currently only supports config file paths. ' +
        'Config object support will be added in a future version. ' +
        'Please provide a path to a configuration file.',
    );
  }

  // Call core simulator
  return await simulateCore(configOrPath, event, {
    json: options.json ?? false,
    verbose: options.verbose ?? false,
  });
}

// Re-export types and utilities for testing
export * from './types';
export * from './simulator';

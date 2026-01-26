import { simulateCore, formatSimulationResult } from './simulator.js';
import { createCommandLogger, getErrorMessage } from '../../core/index.js';
import { loadJsonFromSource } from '../../config/index.js';
import type { SimulateCommandOptions } from './types.js';

/**
 * CLI command handler for simulate command
 */
export async function simulateCommand(
  options: SimulateCommandOptions,
): Promise<void> {
  const logger = createCommandLogger(options);
  const startTime = Date.now();

  try {
    // Load event from inline JSON, file path, or URL
    const event = await loadJsonFromSource(options.event, {
      name: 'event',
    });

    // Execute simulation
    const result = await simulateCore(options.config, event, {
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });

    // Add duration to result
    const resultWithDuration = {
      ...result,
      duration: (Date.now() - startTime) / 1000,
    };

    // Output results using consistent formatter
    const output = formatSimulationResult(resultWithDuration, {
      json: options.json,
    });
    if (options.json) {
      console.log(output);
    } else {
      logger.log(output);
    }

    // Exit with appropriate code
    // Explicit exit avoids hanging from open handles (JSDOM, HTTP connections, etc.)
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      logger.json({
        success: false,
        error: errorMessage,
        duration: (Date.now() - startTime) / 1000,
      });
    } else {
      logger.error(`Error: ${errorMessage}`);
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
export * from './types.js';
export * from './simulator.js';
export { executeInNode } from './node-executor.js';

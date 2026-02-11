import { simulateCore, formatSimulationResult } from './simulator.js';
import {
  createCommandLogger,
  getErrorMessage,
  isStdinPiped,
  readStdin,
  writeResult,
} from '../../core/index.js';
import { loadJsonFromSource } from '../../config/index.js';
import type { SimulateCommandOptions } from './types.js';
import type { SimulateOptions, Platform } from '../../schemas/simulate.js';

/**
 * CLI command handler for simulate command
 */
export async function simulateCommand(
  options: SimulateCommandOptions,
): Promise<void> {
  const logger = createCommandLogger({ ...options, stderr: true });
  const startTime = Date.now();

  try {
    // Resolve config: stdin > argument > default
    let config: string;
    if (isStdinPiped() && !options.config) {
      const stdinContent = await readStdin();
      // Write stdin to temp file for simulateCore (expects file path)
      const fs = await import('fs-extra');
      const path = await import('path');
      const tmpPath = path.default.resolve('.tmp', 'stdin-simulate.json');
      await fs.default.ensureDir(path.default.dirname(tmpPath));
      await fs.default.writeFile(tmpPath, stdinContent, 'utf-8');
      config = tmpPath;
    } else {
      config = options.config || 'bundle.config.json';
    }

    // Load event from inline JSON, file path, or URL
    const event = await loadJsonFromSource(options.event, {
      name: 'event',
    });

    // Execute simulation
    const result = await simulateCore(config, event, {
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

    // Format and write result
    const formatted = formatSimulationResult(resultWithDuration, {
      json: options.json,
    });
    await writeResult(formatted + '\n', { output: options.output });

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      const errorOutput = JSON.stringify(
        {
          success: false,
          error: errorMessage,
          duration: (Date.now() - startTime) / 1000,
        },
        null,
        2,
      );
      await writeResult(errorOutput + '\n', { output: options.output });
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
  options: SimulateOptions & { flow?: string; platform?: Platform } = {},
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
    flow: options.flow,
    platform: options.platform,
  });
}

// Re-export types and utilities for testing
export * from './types.js';
export * from './simulator.js';
export { executeInNode } from './node-executor.js';

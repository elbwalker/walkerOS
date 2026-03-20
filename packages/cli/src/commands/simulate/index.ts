import { simulateCore, formatSimulationResult } from './simulator.js';
import { simulateSourceCLI } from './source-simulator.js';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  getErrorMessage,
  getTmpPath,
  isStdinPiped,
  readStdin,
  writeResult,
} from '../../core/index.js';
import { loadJsonFromSource, loadJsonConfig } from '../../config/index.js';
import { validateFlowConfig } from '../../config/validators.js';
import type { SimulateCommandOptions, SimulationResult } from './types.js';
import type { SimulateOptions, Platform } from '../../schemas/simulate.js';
import type { Flow } from '@walkeros/core';

/**
 * CLI command handler for simulate command
 */
export async function simulateCommand(
  options: SimulateCommandOptions,
): Promise<void> {
  const logger = createCLILogger({ ...options, stderr: true });
  const startTime = Date.now();

  try {
    let config: string;
    if (isStdinPiped() && !options.config) {
      const stdinContent = await readStdin();
      const fs = await import('fs-extra');
      const path = await import('path');
      const tmpPath = getTmpPath(undefined, 'stdin-simulate.json');
      await fs.default.ensureDir(path.default.dirname(tmpPath));
      await fs.default.writeFile(tmpPath, stdinContent, 'utf-8');
      config = tmpPath;
    } else {
      config = options.config || 'bundle.config.json';
    }

    const result = await simulate(config, options.event, {
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
      platform: options.platform,
      step: options.step,
    });

    const resultWithDuration = {
      ...result,
      duration: (Date.now() - startTime) / 1000,
    };

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
 * For destinations/transformers: event is a walkerOS event { name, data }.
 * For sources (--step source.*): event is a SourceInput { content, trigger?, env? }.
 */
export async function simulate(
  configOrPath: string | unknown,
  event: unknown,
  options: SimulateOptions & {
    flow?: string;
    platform?: Platform;
    step?: string;
  } = {},
): Promise<SimulationResult> {
  if (typeof configOrPath !== 'string') {
    throw new Error(
      'simulate() currently only supports config file paths. ' +
        'Please provide a path to a configuration file.',
    );
  }

  // Resolve string event inputs (file paths, URLs, JSON strings)
  let resolvedEvent = event;
  if (typeof event === 'string') {
    resolvedEvent = await loadJsonFromSource(event, { name: 'event' });
  }

  // Detect source simulation via --step
  const isSourceSimulation = options.step?.startsWith('source.');

  let result: SimulationResult;

  if (isSourceSimulation) {
    const rawConfig = await loadJsonConfig<Flow.Config>(configOrPath);
    const setup = validateFlowConfig(rawConfig);
    const flowNames = Object.keys(setup.flows);
    const flowName =
      options.flow || (flowNames.length === 1 ? flowNames[0] : undefined);
    if (!flowName) {
      throw new Error(
        `Multiple flows found. Use --flow to specify which flow.\n` +
          `Available: ${flowNames.join(', ')}`,
      );
    }
    const flowSettings = setup.flows[flowName];
    if (!flowSettings) {
      throw new Error(
        `Flow "${flowName}" not found. Available: ${flowNames.join(', ')}`,
      );
    }

    const sourceStep = options.step!.substring('source.'.length);

    result = await simulateSourceCLI(
      flowSettings as unknown as Record<string, unknown>,
      resolvedEvent,
      {
        flow: options.flow,
        sourceStep,
        json: options.json,
        verbose: options.verbose,
        silent: options.silent,
      },
    );
  } else {
    result = await simulateCore(configOrPath, resolvedEvent, {
      json: options.json ?? false,
      verbose: options.verbose ?? false,
      silent: options.silent ?? false,
      flow: options.flow,
      platform: options.platform,
      step: options.step,
    });
  }

  return result;
}

// Re-export types and utilities
export * from './types.js';
export * from './simulator.js';
export { findExample } from './example-loader.js';
export { compareOutput } from './compare.js';

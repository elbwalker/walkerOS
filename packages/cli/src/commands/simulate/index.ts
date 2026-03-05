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
import { validateFlowSetup } from '../../config/validators.js';
import { findExample } from './example-loader.js';
import { compareOutput } from './compare.js';
import type {
  SimulateCommandOptions,
  ExampleMatch,
  SimulationResult,
} from './types.js';
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
    // Resolve config: stdin > argument > default
    let config: string;
    if (isStdinPiped() && !options.config) {
      const stdinContent = await readStdin();
      // Write stdin to temp file for simulateCore (expects file path)
      const fs = await import('fs-extra');
      const path = await import('path');
      const tmpPath = getTmpPath(undefined, 'stdin-simulate.json');
      await fs.default.ensureDir(path.default.dirname(tmpPath));
      await fs.default.writeFile(tmpPath, stdinContent, 'utf-8');
      config = tmpPath;
    } else {
      config = options.config || 'bundle.config.json';
    }

    // Load event: from --example or from --event
    let event: unknown;
    let exampleContext:
      | { stepType: string; stepName: string; expected: unknown }
      | undefined;

    if (options.example) {
      // Load raw config to access examples (before getFlowConfig strips them)
      const rawConfig = await loadJsonConfig<Flow.Setup>(config);
      const setup = validateFlowSetup(rawConfig);

      // Resolve flow name
      const flowNames = Object.keys(setup.flows);
      let flowName = options.flow;
      if (!flowName) {
        if (flowNames.length === 1) {
          flowName = flowNames[0];
        } else {
          throw new Error(
            `Multiple flows found. Use --flow to specify which flow contains the example.\n` +
              `Available flows: ${flowNames.join(', ')}`,
          );
        }
      }

      const flowConfig = setup.flows[flowName];
      if (!flowConfig) {
        throw new Error(
          `Flow "${flowName}" not found. Available: ${flowNames.join(', ')}`,
        );
      }

      // Find the example in the raw config
      const found = findExample(flowConfig, options.example, options.step);

      if (found.example.in === undefined) {
        throw new Error(
          `Example "${options.example}" in ${found.stepType}.${found.stepName} has no "in" value`,
        );
      }

      event = found.example.in;
      exampleContext = {
        stepType: found.stepType,
        stepName: found.stepName,
        expected: found.example.out,
      };
    } else {
      event = await loadJsonFromSource(options.event, {
        name: 'event',
      });
    }

    // Detect source simulation
    const isSourceSimulation =
      exampleContext?.stepType === 'source' ||
      options.step?.startsWith('source.');

    let result: SimulationResult;

    if (isSourceSimulation) {
      // Source simulation: load flow config and use shared simulateSource
      const rawConfig = await loadJsonConfig<Flow.Setup>(config);
      const setup = validateFlowSetup(rawConfig);
      const flowNames = Object.keys(setup.flows);
      const flowName =
        options.flow || (flowNames.length === 1 ? flowNames[0] : undefined);
      if (!flowName) {
        throw new Error(
          `Multiple flows found. Use --flow to specify which flow.\n` +
            `Available: ${flowNames.join(', ')}`,
        );
      }
      const flowConfig = setup.flows[flowName];
      if (!flowConfig) {
        throw new Error(
          `Flow "${flowName}" not found. Available: ${flowNames.join(', ')}`,
        );
      }

      const sourceStep =
        exampleContext?.stepName || options.step!.substring('source.'.length);

      result = await simulateSourceCLI(
        flowConfig as unknown as Record<string, unknown>,
        event,
        {
          flow: options.flow,
          sourceStep,
          json: options.json,
          verbose: options.verbose,
          silent: options.silent,
        },
      );
    } else {
      // Standard simulation (destination/transformer)
      const stepTarget = exampleContext
        ? `${exampleContext.stepType}.${exampleContext.stepName}`
        : options.step;
      result = await simulateCore(config, event, {
        flow: options.flow,
        json: options.json,
        verbose: options.verbose,
        silent: options.silent,
        step: stepTarget,
      });
    }

    // Compare output against example if --example was used
    let exampleMatch: ExampleMatch | undefined;
    if (exampleContext && result.success) {
      const stepKey = `${exampleContext.stepType}.${exampleContext.stepName}`;

      if (exampleContext.expected === false) {
        // out: false means the event should be filtered (not reach the destination)
        const calls = result.usage?.[exampleContext.stepName];
        const wasFiltered = !calls || calls.length === 0;
        exampleMatch = {
          name: options.example!,
          step: stepKey,
          expected: false,
          actual: wasFiltered ? false : calls,
          match: wasFiltered,
          diff: wasFiltered
            ? undefined
            : `Expected event to be filtered, but ${calls!.length} API call(s) were made`,
        };
      } else if (exampleContext.expected !== undefined) {
        // Compare actual usage against expected output
        const actual = result.usage?.[exampleContext.stepName] ?? [];
        exampleMatch = {
          name: options.example!,
          step: stepKey,
          ...compareOutput(exampleContext.expected, actual),
        };
      }
    }

    // Add duration and example match to result
    const resultWithDuration = {
      ...result,
      duration: (Date.now() - startTime) / 1000,
      ...(exampleMatch ? { exampleMatch } : {}),
    };

    // Format and write result
    const formatted = formatSimulationResult(resultWithDuration, {
      json: options.json,
    });
    await writeResult(formatted + '\n', { output: options.output });

    const exitCode =
      !result.success || (exampleMatch && !exampleMatch.match) ? 1 : 0;
    process.exit(exitCode);
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
  options: SimulateOptions & {
    flow?: string;
    platform?: Platform;
    example?: string;
    step?: string;
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

  // Resolve string event inputs (file paths, URLs, JSON strings)
  let resolvedEvent = event;
  if (typeof event === 'string') {
    resolvedEvent = await loadJsonFromSource(event, { name: 'event' });
  }

  let exampleContext:
    | { stepType: string; stepName: string; expected: unknown }
    | undefined;

  // If --example is provided, load the example from the raw config
  if (options.example) {
    const rawConfig = await loadJsonConfig<Flow.Setup>(configOrPath);
    const setup = validateFlowSetup(rawConfig);

    const flowNames = Object.keys(setup.flows);
    let flowName = options.flow;
    if (!flowName) {
      if (flowNames.length === 1) {
        flowName = flowNames[0];
      } else {
        throw new Error(
          `Multiple flows found. Use --flow to specify which flow contains the example.\n` +
            `Available flows: ${flowNames.join(', ')}`,
        );
      }
    }

    const flowConfig = setup.flows[flowName];
    if (!flowConfig) {
      throw new Error(
        `Flow "${flowName}" not found. Available: ${flowNames.join(', ')}`,
      );
    }

    const found = findExample(flowConfig, options.example, options.step);
    if (found.example.in === undefined) {
      throw new Error(
        `Example "${options.example}" in ${found.stepType}.${found.stepName} has no "in" value`,
      );
    }

    resolvedEvent = found.example.in;
    exampleContext = {
      stepType: found.stepType,
      stepName: found.stepName,
      expected: found.example.out,
    };
  }

  // Call core simulator
  const result = await simulateCore(configOrPath, resolvedEvent, {
    json: options.json ?? false,
    verbose: options.verbose ?? false,
    flow: options.flow,
    platform: options.platform,
  });

  // Compare output against example if --example was used
  if (exampleContext && result.success) {
    const stepKey = `${exampleContext.stepType}.${exampleContext.stepName}`;

    if (exampleContext.expected === false) {
      const calls = result.usage?.[exampleContext.stepName];
      const wasFiltered = !calls || calls.length === 0;
      result.exampleMatch = {
        name: options.example!,
        step: stepKey,
        expected: false,
        actual: wasFiltered ? false : calls,
        match: wasFiltered,
        diff: wasFiltered
          ? undefined
          : `Expected event to be filtered, but ${calls!.length} API call(s) were made`,
      };
    } else if (exampleContext.expected !== undefined) {
      const actual = result.usage?.[exampleContext.stepName] ?? [];
      result.exampleMatch = {
        name: options.example!,
        step: stepKey,
        ...compareOutput(exampleContext.expected, actual),
      };
    }
  }

  return result;
}

// Re-export types and utilities for testing
export * from './types.js';
export * from './simulator.js';
export { findExample } from './example-loader.js';
export { compareOutput } from './compare.js';

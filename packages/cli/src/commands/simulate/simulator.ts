import fs from 'fs-extra';
import type { Destination, Simulation, WalkerOS } from '@walkeros/core';
import { simulate } from '@walkeros/collector';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  getErrorMessage,
  detectInput,
  type Platform,
} from '../../core/index.js';
import { loadFlowConfig, isObject } from '../../config/index.js';
import { getTmpPath } from '../../core/tmp.js';
import { loadDestinationEnvs } from './env-loader.js';
import type { SimulateCommandOptions, SimulationResult } from './types.js';

/**
 * Convert Simulation.Call[] to CLI's usage format
 */
function callsToUsage(
  destName: string,
  calls: Simulation.Call[],
): Record<
  string,
  Array<{ type: 'call'; path: string; args: unknown[]; timestamp: number }>
> {
  if (!calls.length) return {};
  return {
    [destName]: calls.map((c) => ({
      type: 'call' as const,
      path: c.fn,
      args: c.args,
      timestamp: c.ts,
    })),
  };
}

/**
 * Main simulation orchestrator
 */
export async function simulateCore(
  inputPath: string,
  event: unknown,
  options: Pick<
    SimulateCommandOptions,
    'flow' | 'json' | 'verbose' | 'silent' | 'platform' | 'step'
  > = {},
): Promise<SimulationResult> {
  const logger = createCLILogger({
    verbose: options.verbose || false,
    silent: options.silent || false,
    json: options.json || false,
  });

  try {
    // Execute simulation
    logger.debug(`Simulating event: ${JSON.stringify(event)}`);
    const result = await executeSimulation(event, inputPath, options.platform, {
      flow: options.flow,
      step: options.step,
      verbose: options.verbose,
    });

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
    const output: Record<string, unknown> = {
      result: result.elbResult,
      usage: result.usage,
      duration: result.duration,
    };
    if (result.capturedEvents) {
      output.capturedEvents = result.capturedEvents;
    }
    return JSON.stringify(output, null, 2);
  }

  const lines: string[] = [];

  if (result.success) {
    lines.push('Simulation completed');
  } else {
    lines.push(`Simulation failed: ${result.error}`);
  }

  if (result.capturedEvents) {
    lines.push(`Captured ${result.capturedEvents.length} event(s)`);
    for (const evt of result.capturedEvents) {
      lines.push(`  - ${(evt as { name?: string }).name || 'unknown'}`);
    }
  }

  return lines.join('\n');
}

/**
 * Execute simulation using destination-provided mock environments.
 * Only accepts Flow.Config config files.
 */
export async function executeSimulation(
  event: unknown,
  inputPath: string,
  platformOverride?: Platform,
  options: {
    flow?: string;
    step?: string;
    verbose?: boolean;
  } = {},
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

    if (detected.type !== 'config') {
      throw new Error(
        `Input "${inputPath}" is not valid JSON config. ` +
          'simulate only accepts Flow.Config config files.',
      );
    }

    return await executeConfigSimulation(
      detected.content,
      inputPath,
      typedEvent,
      tempDir,
      startTime,
      options.flow,
      options.step,
    );
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
 * Parse step target into type + name.
 * E.g., "destination.gtag" → { type: "destination", name: "gtag" }
 */
function parseStepTarget(
  stepTarget: string | undefined,
  flowConfig: Record<string, unknown>,
): {
  type: 'destination' | 'transformer';
  name: string;
  config: Record<string, unknown>;
} {
  if (stepTarget) {
    const dotIndex = stepTarget.indexOf('.');
    if (dotIndex > -1) {
      const type = stepTarget.substring(0, dotIndex) as
        | 'destination'
        | 'transformer';
      const name = stepTarget.substring(dotIndex + 1);
      const section = (flowConfig as Record<string, Record<string, unknown>>)[
        type + 's'
      ];
      if (!section?.[name]) {
        throw new Error(`Step "${stepTarget}" not found in flow config`);
      }
      return { type, name, config: section[name] as Record<string, unknown> };
    }
  }

  // Default: first destination
  const destinations = (
    flowConfig as { destinations?: Record<string, unknown> }
  ).destinations;
  if (destinations) {
    const [name, config] = Object.entries(destinations)[0];
    return {
      type: 'destination',
      name,
      config: config as Record<string, unknown>,
    };
  }

  throw new Error('No destination found in flow config');
}

/**
 * Execute simulation from config JSON using unified simulate().
 * Uses direct package imports instead of bundling.
 */
async function executeConfigSimulation(
  _content: string,
  configPath: string,
  typedEvent: { name: string; data?: unknown },
  tempDir: string,
  startTime: number,
  flowName?: string,
  stepTarget?: string,
): Promise<SimulationResult> {
  // Load config
  const { flowSettings } = await loadFlowConfig(configPath, {
    flowName,
  });

  // Parse step target
  const step = parseStepTarget(
    stepTarget,
    flowSettings as unknown as Record<string, unknown>,
  );

  if (step.type === 'destination') {
    const packageName = step.config.package as string;
    if (!packageName) {
      throw new Error(`Destination "${step.name}" has no package field`);
    }

    // Load destination code
    const destModule = await import(packageName);
    const code: Destination.Instance =
      destModule.default || Object.values(destModule)[0];

    // Load env mocks from /dev exports
    const destinations = (
      flowSettings as unknown as { destinations?: Record<string, unknown> }
    ).destinations;
    const envs = await loadDestinationEnvs(destinations || {});
    const destEnv = envs[step.name];

    const result = await simulate({
      step: 'destination',
      name: step.name,
      code,
      event: typedEvent as WalkerOS.DeepPartialEvent,
      config: step.config.config as Record<string, unknown>,
      env: destEnv?.push,
      track: destEnv?.simulation,
    });

    const duration = Date.now() - startTime;

    return {
      success: !result.error,
      error: result.error?.message,
      usage: callsToUsage(step.name, result.calls),
      duration,
      logs: [],
    };
  }

  if (step.type === 'transformer') {
    const packageName = step.config.package as string;
    if (!packageName) {
      throw new Error(`Transformer "${step.name}" has no package field`);
    }

    // Load transformer code
    const mod = await import(packageName);
    const code = mod.default || Object.values(mod)[0];

    const result = await simulate({
      step: 'transformer',
      name: step.name,
      code,
      event: typedEvent as WalkerOS.DeepPartialEvent,
      config: step.config.config as Record<string, unknown>,
    });

    const duration = Date.now() - startTime;

    return {
      success: !result.error,
      error: result.error?.message,
      capturedEvents: result.events,
      duration,
      usage: {},
      logs: [],
    };
  }

  throw new Error(`Unknown step type: ${step.type}`);
}

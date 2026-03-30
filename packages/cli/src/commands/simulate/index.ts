import { createCLILogger } from '../../core/cli-logger.js';
import {
  getErrorMessage,
  isStdinPiped,
  readStdinToTempFile,
  writeResult,
} from '../../core/index.js';
import { push } from '../push/index.js';
import type { PushResult } from '../push/types.js';
import type { Platform } from '../../schemas/simulate.js';

interface SimulateCommandOptions {
  config?: string;
  output?: string;
  event?: string;
  flow?: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
  platform?: Platform;
  step?: string;
}

/**
 * CLI command handler for simulate command.
 * Delegates to push with --simulate flag.
 */
export async function simulateCommand(
  options: SimulateCommandOptions,
): Promise<void> {
  const logger = createCLILogger({ ...options, stderr: true });
  const startTime = Date.now();

  try {
    let config: string;
    if (isStdinPiped() && !options.config) {
      config = await readStdinToTempFile('simulate');
    } else {
      config = options.config || 'bundle.config.json';
    }

    // Map --step to --simulate array for push
    const simulate = options.step ? [options.step] : undefined;

    const result = await push(config, options.event, {
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
      platform: options.platform,
      simulate,
    });

    const duration = Date.now() - startTime;

    const formatted = formatResult(result, duration, { json: options.json });
    await writeResult(formatted + '\n', { output: options.output });

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      const errorOutput = JSON.stringify(
        {
          success: false,
          error: errorMessage,
          duration: Date.now() - startTime,
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
 * Programmatic simulate function. Delegates to push with simulate flag.
 */
export async function simulate(
  configOrPath: string | unknown,
  event: unknown,
  options: {
    flow?: string;
    json?: boolean;
    verbose?: boolean;
    silent?: boolean;
    platform?: Platform;
    step?: string;
  } = {},
): Promise<PushResult> {
  const simulate = options.step ? [options.step] : undefined;

  return push(configOrPath, event, {
    flow: options.flow,
    json: options.json,
    verbose: options.verbose,
    silent: options.silent,
    platform: options.platform,
    simulate,
  });
}

/**
 * Format push result for simulate CLI output.
 */
function formatResult(
  result: PushResult,
  duration: number,
  options: { json?: boolean } = {},
): string {
  if (options.json) {
    return JSON.stringify(
      {
        success: result.success,
        event: result.elbResult,
        captured: result.captured,
        usage: result.usage,
        duration,
      },
      null,
      2,
    );
  }

  const lines: string[] = [];

  if (result.success) {
    lines.push('Simulation completed');
  } else {
    lines.push(`Simulation failed: ${result.error}`);
  }

  if (result.captured && result.captured.length > 0) {
    lines.push(`Captured ${result.captured.length} event(s)`);
    for (const evt of result.captured) {
      const name = (evt as { event?: { name?: string } }).event?.name;
      lines.push(`  - ${name || 'unknown'}`);
    }
  }

  return lines.join('\n');
}

// Re-export utilities that are still used
export { findExample } from './example-loader.js';
export { compareOutput } from './compare.js';

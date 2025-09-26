import { simulate, parseEventInput, formatSimulationResult } from './simulator';
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
    const result = await simulate(options.config, event, {
      json: options.json,
      verbose: options.verbose,
    });

    // Add duration to result
    const resultWithDuration = {
      ...result,
      duration: (Date.now() - startTime) / 1000,
    };

    // Output results
    const output = formatSimulationResult(resultWithDuration, {
      json: options.json,
    });
    console.log(output);

    // Exit with error code if simulation failed
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: errorMessage,
            duration: (Date.now() - startTime) / 1000,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(`❌ Simulate command failed: ${errorMessage}`);
    }

    process.exit(1);
  }
}

// Re-export types and utilities for testing
export * from './types';
export * from './simulator';
export * from './loader';

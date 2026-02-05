// walkerOS/packages/cli/src/commands/validate/index.ts

import chalk from 'chalk';
import { createCommandLogger, getErrorMessage } from '../../core/index.js';
import { loadJsonFromSource } from '../../config/index.js';
import {
  validateEvent,
  validateFlow,
  validateMapping,
} from './validators/index.js';
import type {
  ValidateCommandOptions,
  ValidateResult,
  ValidationType,
} from './types.js';

/**
 * Programmatic API for validation.
 * Can be called directly from code or MCP server.
 */
export async function validate(
  type: ValidationType,
  input: unknown,
  options: { flow?: string } = {},
): Promise<ValidateResult> {
  switch (type) {
    case 'event':
      return validateEvent(input);
    case 'flow':
      return validateFlow(input, { flow: options.flow });
    case 'mapping':
      return validateMapping(input);
    default:
      throw new Error(`Unknown validation type: ${type}`);
  }
}

/**
 * Format validation result for CLI output.
 */
function formatResult(
  result: ValidateResult,
  options: { json?: boolean; verbose?: boolean },
): string {
  if (options.json) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];
  lines.push('');
  lines.push(`Validating ${result.type}...`);
  lines.push('');

  // Show details if verbose
  if (options.verbose && Object.keys(result.details).length > 0) {
    lines.push('Details:');
    for (const [key, value] of Object.entries(result.details)) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    }
    lines.push('');
  }

  lines.push('Validation Results:');

  // Errors
  for (const error of result.errors) {
    lines.push(chalk.red(`  ✗ ${error.path}: ${error.message}`));
  }

  // Warnings
  for (const warning of result.warnings) {
    lines.push(chalk.yellow(`  ⚠ ${warning.path}: ${warning.message}`));
    if (warning.suggestion) {
      lines.push(chalk.gray(`    → ${warning.suggestion}`));
    }
  }

  // Success items (count based on lack of errors for checked fields)
  if (result.valid) {
    lines.push(chalk.green(`  ✓ All checks passed`));
  }

  lines.push('');
  lines.push(
    `Summary: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`,
  );

  return lines.join('\n');
}

/**
 * CLI command handler for validate command.
 */
export async function validateCommand(
  options: ValidateCommandOptions,
): Promise<void> {
  const logger = createCommandLogger(options);

  try {
    // Load input from JSON string, file, or URL
    const input = await loadJsonFromSource(options.input, {
      name: options.type,
      required: true,
    });

    // Run validation
    const result = await validate(options.type, input, {
      flow: options.flow,
    });

    // Output result
    const output = formatResult(result, {
      json: options.json,
      verbose: options.verbose,
    });

    if (options.json) {
      console.log(output);
    } else {
      logger.log(output);
    }

    // Exit code based on result
    if (!result.valid) {
      process.exit(1);
    }
    if (options.strict && result.warnings.length > 0) {
      process.exit(2);
    }
    process.exit(0);
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      logger.json({
        valid: false,
        type: options.type,
        errors: [{ path: 'input', message: errorMessage, code: 'INPUT_ERROR' }],
        warnings: [],
        details: {},
      });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }

    process.exit(3);
  }
}

// Re-export types
export * from './types.js';
export {
  validateEvent,
  validateFlow,
  validateMapping,
} from './validators/index.js';

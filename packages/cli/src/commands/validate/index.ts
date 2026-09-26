// walkerOS/packages/cli/src/commands/validate/index.ts

import chalk from 'chalk';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  getErrorMessage,
  isStdinPiped,
  readStdin,
  writeResult,
} from '../../core/index.js';
import { loadJsonConfig } from '../../config/index.js';
import {
  validateContract,
  validateEvent,
  validateFlow,
  validateMapping,
} from './validators/index.js';
import { validateEntry } from './validators/entry.js';
import type { ValidateOptions } from '../../schemas/validate.js';
import {
  USAGE_CODES,
  type ValidateCheck,
  type ValidateCommandOptions,
  type ValidateResult,
  type ValidationError,
  type ValidationType,
} from './types.js';

/**
 * Options that do not apply to the validation type: `--path` and `--flow`
 * address flow files only. Never ignored silently (OPTION_NOT_APPLICABLE).
 */
function inapplicableOptions(
  type: ValidationType,
  options: ValidateOptions,
): ValidationError[] {
  if (type === 'flow') return [];
  const errors: ValidationError[] = [];
  if (options.path !== undefined) {
    errors.push({
      path: 'options.path',
      message: `--path addresses an entry in a flow file and does not apply to -t ${type}`,
      code: 'OPTION_NOT_APPLICABLE',
    });
  }
  if (options.flow !== undefined) {
    errors.push({
      path: 'options.flow',
      message: `--flow names a flow in a flow file and does not apply to -t ${type}`,
      code: 'OPTION_NOT_APPLICABLE',
    });
  }
  return errors;
}

/** Whole-document validations state their one check as their scope. */
function withDocumentScope(
  result: ValidateResult,
  check: ValidateCheck,
): ValidateResult {
  return {
    ...result,
    details: {
      ...result.details,
      scope: result.details.scope ?? { flows: [], checks: [check] },
      skipped: result.details.skipped ?? [],
    },
  };
}

/**
 * Programmatic API for validation.
 * Can be called directly from code or MCP server.
 *
 * Accepts parsed objects, JSON strings, file paths, or URLs as input.
 */
export async function validate(
  type: ValidationType,
  input: unknown,
  options: ValidateOptions = {},
): Promise<ValidateResult> {
  // Resolve string inputs (file paths, URLs, JSON strings) to parsed objects.
  // A path that cannot be read or parsed is an input error, never a document.
  let resolved = input;
  if (typeof input === 'string') {
    if (input.trim() === '') throw new Error(`${type} is required`);
    resolved = await loadJsonConfig(input);
  }

  const misuse = inapplicableOptions(type, options);
  if (misuse.length > 0) {
    return {
      valid: false,
      type,
      errors: misuse,
      warnings: [],
      details: { scope: { flows: [], checks: [] }, skipped: [] },
    };
  }

  switch (type) {
    case 'contract':
      return withDocumentScope(validateContract(resolved), 'contract');
    case 'event':
      return withDocumentScope(validateEvent(resolved), 'event');
    case 'flow':
      if (options.path !== undefined) {
        return validateEntry(options.path, resolved, { flow: options.flow });
      }
      return validateFlow(resolved, {
        flow: options.flow,
        strict: options.strict,
      });
    case 'mapping':
      return withDocumentScope(validateMapping(resolved), 'mapping');
    default:
      throw new Error(`Unknown validation type: ${type}`);
  }
}

/** One line naming what the run covered (C6). */
function formatScope(result: ValidateResult): string | undefined {
  const scope = result.details.scope;
  if (!scope) return undefined;
  const parts: string[] = [];
  if (scope.flows.length > 0) parts.push(`flows ${scope.flows.join(', ')}`);
  if (scope.entry) {
    const { section, key, flows, searchedFlows } = scope.entry;
    const name = section ? `${section}.${key}` : key;
    parts.push(
      `entry ${name} in ${flows.join(', ') || 'no flow'} (searched ${searchedFlows.join(', ') || 'none'})`,
    );
  }
  parts.push(`${scope.checks.length} check(s): ${scope.checks.join(', ')}`);
  return `Scope: ${parts.join('; ')}`;
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

  const scopeLine = formatScope(result);
  if (scopeLine) {
    lines.push(scopeLine);
    lines.push('');
  }

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

  // Skips are listed whatever the verbosity (C5)
  const skipped = result.details.skipped ?? [];
  for (const skip of skipped) {
    lines.push(
      chalk.gray(`  - skipped ${skip.check} at ${skip.path}: ${skip.reason}`),
    );
  }

  if (result.valid && skipped.length === 0) {
    lines.push(chalk.green(`  ✓ All checks passed`));
  } else if (result.valid) {
    lines.push(
      chalk.green(
        `  ✓ No errors in checked scope; ${skipped.length} check(s) skipped`,
      ),
    );
  }

  lines.push('');
  lines.push(
    `Summary: ${result.errors.length} error(s), ${result.warnings.length} warning(s), ${skipped.length} skipped`,
  );

  return lines.join('\n');
}

/**
 * CLI command handler for validate command.
 */
export async function validateCommand(
  options: ValidateCommandOptions,
): Promise<void> {
  // Result always goes to stdout; logs to stderr
  const logger = createCLILogger({ ...options, stderr: true });

  let exitCode: number;
  try {
    // Load input: stdin > argument > error
    let input: unknown;
    if (isStdinPiped() && !options.input) {
      const stdinContent = await readStdin();
      try {
        input = JSON.parse(stdinContent);
      } catch {
        throw new Error('Invalid JSON received on stdin');
      }
    } else {
      input = options.input;
    }

    // Run validation
    const result = await validate(options.type, input, {
      flow: options.flow,
      path: options.path,
      strict: options.strict,
    });

    // Format and write result; --silent suppresses stdout, never a file
    if (!options.silent || options.output) {
      const formatted = formatResult(result, {
        json: options.json,
        verbose: options.verbose,
      });
      await writeResult(formatted + '\n', { output: options.output });
    }

    exitCode = exitCodeOf(result, options.strict === true);
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      const errorOutput = JSON.stringify(
        {
          valid: false,
          type: options.type,
          errors: [
            { path: 'input', message: errorMessage, code: 'INPUT_ERROR' },
          ],
          warnings: [],
          details: {},
        },
        null,
        2,
      );
      await writeResult(errorOutput + '\n', { output: options.output });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }

    exitCode = 3;
  }
  process.exit(exitCode);
}

/**
 * Exit code (C7): 3 could not run, 1 errors, 2 warnings or skips under
 * --strict, 0 valid.
 */
function exitCodeOf(result: ValidateResult, strict: boolean): number {
  if (
    result.errors.some((e) =>
      USAGE_CODES.some((usageCode) => usageCode === e.code),
    )
  )
    return 3;
  if (!result.valid) return 1;
  const skipped = result.details.skipped ?? [];
  if (strict && (result.warnings.length > 0 || skipped.length > 0)) return 2;
  return 0;
}

// Re-export types
export * from './types.js';
export {
  validateContract,
  validateEvent,
  validateFlow,
  validateMapping,
} from './validators/index.js';
export { validateEntry } from './validators/entry.js';

// walkerOS/packages/cli/src/commands/validate/validators/flow.ts

import { schemas } from '@walkeros/core/dev';
import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const { SetupSchema } = schemas;

interface FlowValidateOptions {
  flow?: string;
}

export function validateFlow(
  input: unknown,
  options: FlowValidateOptions = {},
): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const details: Record<string, unknown> = {};

  const config = (
    typeof input === 'object' && input !== null ? input : {}
  ) as Record<string, unknown>;

  // 1. Validate against SetupSchema
  const zodResult = SetupSchema.safeParse(input);
  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      const path = issue.path.join('.');
      errors.push({
        path: path || 'root',
        message: issue.message,
        code: 'SCHEMA_VALIDATION',
      });
    }
  }

  // 2. Check for empty flows
  const flows = config.flows as Record<string, unknown> | undefined;
  if (flows && typeof flows === 'object' && Object.keys(flows).length === 0) {
    errors.push({
      path: 'flows',
      message: 'At least one flow is required',
      code: 'EMPTY_FLOWS',
    });
  }

  // 3. Extract flow details
  if (flows && typeof flows === 'object') {
    const flowNames = Object.keys(flows);
    details.flowNames = flowNames;
    details.flowCount = flowNames.length;

    // 4. Validate specific flow if requested
    if (options.flow) {
      if (!flowNames.includes(options.flow)) {
        errors.push({
          path: 'flows',
          message: `Flow "${options.flow}" not found. Available: ${flowNames.join(', ')}`,
          code: 'FLOW_NOT_FOUND',
        });
      } else {
        details.validatedFlow = options.flow;
      }
    }
  }

  // 5. Warnings for packages without version
  const packages = config.packages as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (packages && typeof packages === 'object') {
    for (const [pkgName, pkgConfig] of Object.entries(packages)) {
      if (!pkgConfig.version && !pkgConfig.path) {
        warnings.push({
          path: `packages.${pkgName}`,
          message: `Package "${pkgName}" has no version specified`,
          suggestion: 'Consider specifying a version for reproducible builds',
        });
      }
    }
    details.packageCount = Object.keys(packages).length;
  }

  return {
    valid: errors.length === 0,
    type: 'flow',
    errors,
    warnings,
    details,
  };
}

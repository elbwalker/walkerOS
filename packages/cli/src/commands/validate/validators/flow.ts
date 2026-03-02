// walkerOS/packages/cli/src/commands/validate/validators/flow.ts

import { schemas } from '@walkeros/core/dev';
import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const { validateFlowSetup } = schemas;

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

  // 1. Serialize to JSON for core validator
  //    Core's validateFlowSetup takes a JSON string, but CLI receives parsed objects.
  //    Re-serializing is the bridge between the two interfaces.
  let json: string;
  try {
    json = JSON.stringify(input, null, 2);
  } catch {
    errors.push({
      path: 'root',
      message: 'Input cannot be serialized to JSON',
      code: 'SERIALIZATION_ERROR',
    });
    return { valid: false, type: 'flow', errors, warnings, details };
  }

  // 2. Run core validation (Zod schema + reference checking)
  const coreResult = validateFlowSetup(json);

  // 3. Map core errors -> CLI ValidationError
  for (const issue of coreResult.errors) {
    errors.push({
      path: issue.path || 'root',
      message: issue.message,
      code: 'SCHEMA_VALIDATION',
    });
  }

  // 4. Map core warnings -> CLI ValidationWarning
  for (const issue of coreResult.warnings) {
    warnings.push({
      path: issue.path || 'root',
      message: issue.message,
    });
  }

  // 5. CLI-specific: check for empty flows
  const config = (
    typeof input === 'object' && input !== null ? input : {}
  ) as Record<string, unknown>;

  const flows = config.flows as Record<string, unknown> | undefined;
  if (flows && typeof flows === 'object' && Object.keys(flows).length === 0) {
    errors.push({
      path: 'flows',
      message: 'At least one flow is required',
      code: 'EMPTY_FLOWS',
    });
  }

  // 6. Extract flow details
  if (flows && typeof flows === 'object') {
    const flowNames = Object.keys(flows);
    details.flowNames = flowNames;
    details.flowCount = flowNames.length;

    // 7. Validate specific flow if requested
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

  // 8. CLI-specific: warn about packages without version
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

  // 9. Expose core's IntelliSense context in details (bonus for MCP consumers)
  if (coreResult.context) {
    details.context = coreResult.context;
  }

  return {
    valid: errors.length === 0,
    type: 'flow',
    errors,
    warnings,
    details,
  };
}

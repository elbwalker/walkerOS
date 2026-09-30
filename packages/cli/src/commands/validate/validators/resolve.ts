// walkerOS/packages/cli/src/commands/validate/validators/resolve.ts

import type { Flow } from '@walkeros/core';
import {
  FlowCycleError,
  FlowReferenceError,
  getFlowSettings,
  getErrorMessage,
} from '@walkeros/core';
import type { ValidateCode, ValidationError } from '../types.js';

export type FlowResolution =
  | { ok: true; flow: Flow }
  | { ok: false; error: ValidationError };

/**
 * Resolve one flow exactly as the bundler does (`getFlowSettings` with
 * deferred `$env`/`$secret`, and `$flow` refs as strict as the bundle). A
 * resolver failure is an error at `flows.<name>`: the bundle of this flow
 * fails the same way.
 */
export function resolveFlow(file: Flow.Json, name: string): FlowResolution {
  try {
    const flow = getFlowSettings(file, name, { deferred: true });
    return { ok: true, flow };
  } catch (error) {
    return {
      ok: false,
      error: {
        path: `flows.${name}`,
        message: getErrorMessage(error),
        code: resolutionCode(error),
      },
    };
  }
}

/** The code of a resolver failure, read from its type. */
function resolutionCode(error: unknown): ValidateCode {
  if (error instanceof FlowReferenceError) return error.code;
  if (error instanceof FlowCycleError) return error.code;
  return 'UNRESOLVED_REFERENCE';
}

import {
  SERVER_OUTPUT_ENTRIES,
  firstPathPartIs,
  getServedFlows,
  servedFlowPath,
  type Flow,
  type ServedFlow,
} from '@walkeros/core';
import type { ValidationError } from '@walkeros/core/dev';

/**
 * Core's served-flow checks of `flowName` plus the archive-entry check: what
 * validate and the bundle preflight run. A path whose first part is a server
 * output entry collides with it; a longer name such as `flow.mjs.d` does not.
 */
export function servedFlowErrors(
  config: Flow.Json,
  flowName: string,
): { served: ServedFlow[]; errors: ValidationError[] } {
  const { served, issues } = getServedFlows(config, flowName);
  const errors: ValidationError[] = [...issues];
  for (const { flow, path } of served) {
    const entry = SERVER_OUTPUT_ENTRIES.find((name) =>
      firstPathPartIs(path, name),
    );
    if (!entry) continue;
    errors.push({
      path: servedFlowPath(flowName, flow),
      code: 'SERVED_PATH_CONFLICT',
      message: `"${path}" collides with "${entry}", which the server build writes`,
      value: path,
    });
  }
  return { served, errors };
}

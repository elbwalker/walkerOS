import { getServedFlows, type Flow, type ServedFlow } from '@walkeros/core';
import type { ValidationError } from '@walkeros/core/dev';

/**
 * What a server build writes at the root of its output folder, and all an
 * archive output packs besides the served files: a served file inside one
 * of them would overwrite the server build or be lost from the archive.
 */
export const SERVER_OUTPUT_ENTRIES = [
  'flow.mjs',
  'node_modules',
  'package.json',
] as const;

/**
 * Core's served-flow checks of `flowName` plus the archive-entry check: what
 * validate and the bundle preflight run. A path whose first part is a server
 * output entry collides with it; a longer name such as `flow.mjs.d` does not.
 * The first part is compared case-folded, since on a case-insensitive file
 * system `Flow.mjs` is the server's `flow.mjs`.
 */
export function servedFlowErrors(
  config: Flow.Json,
  flowName: string,
): { served: ServedFlow[]; errors: ValidationError[] } {
  const { served, issues } = getServedFlows(config, flowName);
  const errors: ValidationError[] = [...issues];
  for (const { flow, path } of served) {
    const first = path.split('/')[0].toLowerCase();
    const entry = SERVER_OUTPUT_ENTRIES.find((name) => name === first);
    if (!entry) continue;
    errors.push({
      path: `flows.${flowName}.config.bundle.flows.${flow}`,
      code: 'SERVED_PATH_CONFLICT',
      message: `"${path}" collides with "${entry}", which the server build writes`,
      value: path,
    });
  }
  return { served, errors };
}

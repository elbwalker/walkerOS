// walkerOS/packages/cli/src/commands/validate/validators/entry.ts

import { describeScope, isFlowJson, resolveScope } from '../scope.js';
import type {
  ValidateDeferred,
  ValidateResult,
  ValidateSkip,
  ValidationError,
} from '../types.js';
import { resolveFlow, type FlowResolution } from './resolve.js';
import {
  checkStepSettings,
  createSettingsContext,
  type CheckedPackage,
} from './settings.js';

/**
 * Validate an entry (source, destination, transformer or store) addressed by
 * `path` (`section.key` or `key`) against its package's published JSON
 * Schema, in every flow that has it, or only in `options.flow`. Settings are
 * checked as the flow resolves them (the placeholder rule); a flow that does
 * not resolve is an error and its entry check a skip.
 */
export async function validateEntry(
  path: string,
  flowConfig: unknown,
  options: { flow?: string; configDir?: string } = {},
): Promise<ValidateResult> {
  const resolved = resolveScope(flowConfig, { flow: options.flow, path });
  const errors: ValidationError[] = [...resolved.errors];
  const skipped: ValidateSkip[] = [];
  const deferred: ValidateDeferred[] = [];
  const packages: CheckedPackage[] = [];
  const context = createSettingsContext(options.configDir);
  const file = isFlowJson(flowConfig) ? flowConfig : undefined;
  const resolutions = new Map<string, FlowResolution>();

  for (const target of resolved.entries) {
    const at = `flows.${target.flow}.${target.section}.${target.key}`;
    let resolution = resolutions.get(target.flow);
    if (!resolution && file) {
      resolution = resolveFlow(file, target.flow);
      resolutions.set(target.flow, resolution);
      if (!resolution.ok) errors.push(resolution.error);
    }
    if (!resolution?.ok) {
      skipped.push({
        path: at,
        check: 'entry:settings',
        reason: `flows.${target.flow} does not resolve, so its settings cannot be checked`,
        code: 'GATED_BY_ERRORS',
      });
      continue;
    }
    const outcome = await checkStepSettings(
      target,
      resolution.flow,
      file?.flows[target.flow],
      'entry:settings',
      context,
    );
    errors.push(...outcome.findings);
    skipped.push(...outcome.skipped);
    deferred.push(...outcome.deferred);
    if (outcome.checked) packages.push(outcome.checked);
  }

  return {
    valid: errors.length === 0,
    type: 'entry',
    errors,
    warnings: [],
    details: {
      scope: describeScope(resolved, ['entry:settings']),
      skipped,
      deferred,
      ...(packages.length > 0 ? { packages } : {}),
    },
  };
}

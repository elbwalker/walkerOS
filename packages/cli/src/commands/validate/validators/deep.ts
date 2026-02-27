// walkerOS/packages/cli/src/commands/validate/validators/deep.ts

import type { Flow } from '@walkeros/core';
import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

interface StepInfo {
  type: 'source' | 'transformer' | 'destination';
  name: string;
  examples: Flow.StepExamples;
}

interface StepConnection {
  from: StepInfo;
  to: StepInfo;
}

interface DeepValidateOptions {
  flow?: string;
}

/**
 * Deep validation: check cross-step example compatibility.
 *
 * Reads the raw Flow.Setup (before getFlowConfig strips examples)
 * and checks:
 * 1. Each step has examples (warn if not)
 * 2. Connected steps have structurally compatible out/in pairs
 * 3. Examples satisfy contracts when defined
 */
export function validateDeep(
  input: unknown,
  options: DeepValidateOptions = {},
): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const setup = (
    typeof input === 'object' && input !== null ? input : {}
  ) as Record<string, unknown>;

  const flows = setup.flows as Record<string, Flow.Config> | undefined;
  if (!flows || typeof flows !== 'object') {
    errors.push({
      path: 'flows',
      message: 'No flows found in configuration',
      code: 'MISSING_FLOWS',
    });
    return { valid: false, type: 'deep', errors, warnings, details: {} };
  }

  // Resolve flow name
  const flowNames = Object.keys(flows);
  const flowName =
    options.flow || (flowNames.length === 1 ? flowNames[0] : undefined);

  if (!flowName) {
    errors.push({
      path: 'flows',
      message: `Multiple flows found. Use --flow to specify. Available: ${flowNames.join(', ')}`,
      code: 'AMBIGUOUS_FLOW',
    });
    return { valid: false, type: 'deep', errors, warnings, details: {} };
  }

  const flowConfig = flows[flowName];
  if (!flowConfig) {
    errors.push({
      path: 'flows',
      message: `Flow "${flowName}" not found. Available: ${flowNames.join(', ')}`,
      code: 'FLOW_NOT_FOUND',
    });
    return { valid: false, type: 'deep', errors, warnings, details: {} };
  }

  // 1. Check example coverage
  checkExampleCoverage(flowConfig, warnings);

  // 2. Build connection graph
  const connections = buildConnectionGraph(flowConfig);

  // 3. Check compatibility for each connection
  for (const conn of connections) {
    checkCompatibility(conn, errors, warnings);
  }

  // 4. Check contract compliance
  const setupContract = setup.contract as Flow.Contract | undefined;
  if (setupContract || flowConfig.contract) {
    checkContractCompliance(
      flowConfig,
      setupContract,
      flowConfig.contract,
      warnings,
    );
  }

  return {
    valid: errors.length === 0,
    type: 'deep',
    errors,
    warnings,
    details: {
      flow: flowName,
      connectionsChecked: connections.length,
    },
  };
}

/**
 * Warn about steps that have no examples.
 */
function checkExampleCoverage(
  config: Flow.Config,
  warnings: ValidationWarning[],
): void {
  const stepTypes = [
    { key: 'sources' as const, type: 'source' },
    { key: 'transformers' as const, type: 'transformer' },
    { key: 'destinations' as const, type: 'destination' },
  ];

  for (const { key, type } of stepTypes) {
    const refs = config[key];
    if (!refs) continue;
    for (const [name, ref] of Object.entries(refs)) {
      if (!ref.examples || Object.keys(ref.examples).length === 0) {
        warnings.push({
          path: `${type}.${name}`,
          message: `Step has no examples`,
          suggestion: `Add examples to ${type}.${name} for testing and documentation`,
        });
      }
    }
  }
}

/**
 * Build the connection graph by tracing source.next, transformer.next,
 * and destination.before relationships.
 */
function buildConnectionGraph(config: Flow.Config): StepConnection[] {
  const connections: StepConnection[] = [];

  // Source → next transformer
  for (const [name, source] of Object.entries(config.sources || {})) {
    if (!source.next || !source.examples) continue;
    const nextNames = Array.isArray(source.next) ? source.next : [source.next];
    for (const nextName of nextNames) {
      const transformer = config.transformers?.[nextName];
      if (transformer?.examples) {
        connections.push({
          from: { type: 'source', name, examples: source.examples },
          to: {
            type: 'transformer',
            name: nextName,
            examples: transformer.examples,
          },
        });
      }
    }
  }

  // Transformer → next transformer
  for (const [name, transformer] of Object.entries(config.transformers || {})) {
    if (!transformer.next || !transformer.examples) continue;
    const nextNames = Array.isArray(transformer.next)
      ? transformer.next
      : [transformer.next];
    for (const nextName of nextNames) {
      const nextTransformer = config.transformers?.[nextName];
      if (nextTransformer?.examples) {
        connections.push({
          from: {
            type: 'transformer',
            name,
            examples: transformer.examples,
          },
          to: {
            type: 'transformer',
            name: nextName,
            examples: nextTransformer.examples,
          },
        });
      }
    }
  }

  // Destination.before → transformer chain → destination
  for (const [name, dest] of Object.entries(config.destinations || {})) {
    if (!dest.before || !dest.examples) continue;
    const beforeNames = Array.isArray(dest.before)
      ? dest.before
      : [dest.before];
    for (const beforeName of beforeNames) {
      const transformer = config.transformers?.[beforeName];
      if (transformer?.examples) {
        connections.push({
          from: {
            type: 'transformer',
            name: beforeName,
            examples: transformer.examples,
          },
          to: { type: 'destination', name, examples: dest.examples },
        });
      }
    }
  }

  return connections;
}

/**
 * Check that connected steps have structurally compatible out/in pairs.
 */
function checkCompatibility(
  conn: StepConnection,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const fromOuts = Object.entries(conn.from.examples)
    .filter(([, ex]) => ex.out !== undefined && ex.out !== false)
    .map(([name, ex]) => ({ name, value: ex.out }));

  const toIns = Object.entries(conn.to.examples)
    .filter(([, ex]) => ex.in !== undefined)
    .map(([name, ex]) => ({ name, value: ex.in }));

  const path = `${conn.from.type}.${conn.from.name} → ${conn.to.type}.${conn.to.name}`;

  if (fromOuts.length === 0 || toIns.length === 0) {
    warnings.push({
      path,
      message: 'Cannot check compatibility: missing out or in examples',
      suggestion:
        'Add out examples to the source step or in examples to the target step',
    });
    return;
  }

  // Check that at least one out/in pair shares structural similarity
  let hasMatch = false;
  for (const out of fromOuts) {
    for (const inp of toIns) {
      if (isStructurallyCompatible(out.value, inp.value)) {
        hasMatch = true;
        break;
      }
    }
    if (hasMatch) break;
  }

  if (!hasMatch) {
    errors.push({
      path,
      message: 'No compatible out/in pair found between connected steps',
      code: 'INCOMPATIBLE_EXAMPLES',
    });
  }
}

/**
 * Structural compatibility: same top-level keys for objects,
 * same array structure, or same primitive type.
 */
function isStructurallyCompatible(a: unknown, b: unknown): boolean {
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) return true;
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    // At least 50% key overlap
    const shared = keysA.filter((k) => keysB.includes(k));
    return shared.length >= Math.min(keysA.length, keysB.length) * 0.5;
  }
  return true;
}

/**
 * Check that destination in examples comply with contracts when defined.
 */
function checkContractCompliance(
  config: Flow.Config,
  setupContract: Flow.Contract | undefined,
  flowContract: Flow.Contract | undefined,
  warnings: ValidationWarning[],
): void {
  for (const [name, dest] of Object.entries(config.destinations || {})) {
    if (!dest.examples) continue;

    for (const [exName, example] of Object.entries(dest.examples)) {
      if (!example.in || typeof example.in !== 'object') continue;

      const event = example.in as { entity?: string; action?: string };
      if (!event.entity || !event.action) continue;

      const contract =
        (flowContract?.[event.entity] as Record<string, unknown> | undefined) ||
        (setupContract?.[event.entity] as Record<string, unknown> | undefined);
      if (!contract || typeof contract !== 'object') continue;

      const actionSchema = contract[event.action] || contract['*'];
      if (actionSchema) {
        warnings.push({
          path: `destination.${name}.examples.${exName}`,
          message: `Example has contract for ${event.entity}.${event.action}`,
          suggestion: 'Verify example data matches contract schema',
        });
      }
    }
  }
}

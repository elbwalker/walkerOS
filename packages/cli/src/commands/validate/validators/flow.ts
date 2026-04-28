// walkerOS/packages/cli/src/commands/validate/validators/flow.ts

import type { Flow } from '@walkeros/core';
import { getFlowSettings, isObject } from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';
import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const { validateFlowConfig } = schemas;

interface FlowValidateOptions {
  flow?: string;
}

/**
 * Type guard for a parsed Flow.Json shape (after schema validation).
 * Used only in soft-resolve so we can call core's resolver without casts.
 */
function isFlowJson(value: unknown): value is Flow.Json {
  if (!isObject(value)) return false;
  if (!('version' in value) || !('flows' in value)) return false;
  return isObject(value.flows);
}

export function validateFlow(
  input: unknown,
  options: FlowValidateOptions = {},
): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const details: Record<string, unknown> = {};

  // 1. Serialize to JSON for core validator
  //    Core's validateFlowConfig takes a JSON string, but CLI receives parsed objects.
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
  const coreResult = validateFlowConfig(json);

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
  const config: Record<string, unknown> = isObject(input) ? input : {};
  const flowsValue = config.flows;
  const flows: Record<string, unknown> | undefined = isObject(flowsValue)
    ? flowsValue
    : undefined;
  if (flows && Object.keys(flows).length === 0) {
    errors.push({
      path: 'flows',
      message: 'At least one flow is required',
      code: 'EMPTY_FLOWS',
    });
  }

  // 6. Extract flow details
  if (flows) {
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

  // 8. CLI-specific: warn about packages without version (per-flow config.bundle.packages)
  let totalPackageCount = 0;
  if (flows) {
    for (const [flowName, flowValue] of Object.entries(flows)) {
      if (!isObject(flowValue)) continue;
      const flowConfig = flowValue.config;
      if (!isObject(flowConfig)) continue;
      const bundle = flowConfig.bundle;
      if (!isObject(bundle)) continue;
      const packages = bundle.packages;
      if (!isObject(packages)) continue;

      for (const [pkgName, pkgConfigValue] of Object.entries(packages)) {
        if (!isObject(pkgConfigValue)) continue;
        if (!pkgConfigValue.version && !pkgConfigValue.path) {
          warnings.push({
            path: `flows.${flowName}.config.bundle.packages.${pkgName}`,
            message: `Package "${pkgName}" has no version specified`,
            suggestion: 'Consider specifying a version for reproducible builds',
          });
        }
      }
      totalPackageCount += Object.keys(packages).length;
    }
  }
  if (totalPackageCount > 0) {
    details.packageCount = totalPackageCount;
  }

  // 9. Expose core's IntelliSense context in details (bonus for MCP consumers)
  if (coreResult.context) {
    details.context = coreResult.context;
  }

  // 10. Deep validation: cross-step example compatibility (typed Flow.Json shape)
  if (errors.length === 0 && isFlowJson(input)) {
    const typedFlows: Record<string, Flow> = input.flows;
    const flowNames = Object.keys(typedFlows);
    const flowsToCheck = options.flow ? [options.flow] : flowNames;

    let totalConnections = 0;
    for (const name of flowsToCheck) {
      const flowSettings = typedFlows[name];
      if (!flowSettings) continue;

      const connections = buildConnectionGraph(flowSettings);
      for (const conn of connections) {
        checkCompatibility(conn, errors, warnings);
      }
      totalConnections += connections.length;

      // Contract compliance (contracts live on Config level only)
      const contract = input.contract;
      if (contract) {
        checkContractCompliance(flowSettings, contract, warnings);
      }
    }
    details.connectionsChecked = totalConnections;

    // Check for flat dot-separated mapping keys (common mistake)
    for (const name of flowsToCheck) {
      const flowSettings = typedFlows[name];
      if (!flowSettings) continue;

      for (const [destName, dest] of Object.entries(
        flowSettings.destinations || {},
      )) {
        if (!isObject(dest.config)) continue;
        const mapping = dest.config.mapping;
        if (!isObject(mapping)) continue;

        for (const key of Object.keys(mapping)) {
          if (key.includes('.') && !key.includes(' ')) {
            const parts = key.split('.');
            warnings.push({
              path: `destination.${destName}.config.mapping`,
              message: `Mapping key "${key}" looks like dot-notation. Mapping uses nested entity → action structure.`,
              suggestion: `Use nested format: { "${parts[0]}": { "${parts.slice(1).join('.')}": { ... } } }`,
            });
          }
        }
      }
    }
  }

  // 11. Soft-resolve $flow refs to surface warnings (does NOT throw on missing
  //     keys / unknown flows; cycles still throw and become errors).
  if (errors.length === 0 && isFlowJson(input)) {
    const flowsMap = input.flows;
    const flowsToResolve = options.flow
      ? options.flow in flowsMap
        ? [options.flow]
        : []
      : Object.keys(flowsMap);

    for (const name of flowsToResolve) {
      try {
        getFlowSettings(input, name, {
          deferred: true, // don't fail on missing $env when validating
          strictFlowRefs: false,
          onWarning: (message) => {
            warnings.push({ path: `flows.${name}`, message });
          },
        });
      } catch (err) {
        // Only surface CYCLES as errors here; other resolver failures (missing
        // $var / $def / etc.) are already reported by the schema/reference
        // checker above and should not double-fail this pass.
        const message = err instanceof Error ? err.message : String(err);
        if (/Cyclic \$flow reference/.test(message)) {
          errors.push({
            path: `flows.${name}`,
            message,
            code: 'FLOW_CYCLE',
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    type: 'flow',
    errors,
    warnings,
    details,
  };
}

// --- Deep validation helpers ---

interface StepInfo {
  type: 'source' | 'transformer' | 'destination';
  name: string;
  examples: Flow.StepExamples;
}

interface StepConnection {
  from: StepInfo;
  to: StepInfo;
}

function buildConnectionGraph(config: Flow): StepConnection[] {
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

function checkCompatibility(
  conn: StepConnection,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const fromOuts = Object.entries(conn.from.examples)
    .filter(([, ex]) => ex.out !== undefined && ex.out.length > 0)
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

function isStructurallyCompatible(a: unknown, b: unknown): boolean {
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) return true;
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    const shared = keysA.filter((k) => keysB.includes(k));
    return shared.length >= Math.min(keysA.length, keysB.length) * 0.5;
  }
  return true;
}

function checkContractCompliance(
  config: Flow,
  contract: Flow.Contract,
  warnings: ValidationWarning[],
): void {
  for (const [name, dest] of Object.entries(config.destinations || {})) {
    if (!dest.examples) continue;

    for (const [exName, example] of Object.entries(dest.examples)) {
      if (!example.in || typeof example.in !== 'object') continue;

      const event = example.in as { entity?: string; action?: string };
      if (!event.entity || !event.action) continue;

      // Walk every named contract rule and look in its events map.
      // First match (entity exact or wildcard, action exact or wildcard) wins.
      let matched = false;
      for (const rule of Object.values(contract)) {
        const events = rule.events;
        if (!events) continue;

        const entityActions = events[event.entity] || events['*'];
        if (!entityActions) continue;

        const actionSchema = entityActions[event.action] || entityActions['*'];
        if (actionSchema) {
          matched = true;
          break;
        }
      }

      if (matched) {
        warnings.push({
          path: `destination.${name}.examples.${exName}`,
          message: `Example has contract for ${event.entity}.${event.action}`,
          suggestion: 'Verify example data matches contract schema',
        });
      }
    }
  }
}

// walkerOS/packages/cli/src/commands/validate/validators/flow.ts

import type { Flow, Transformer, WalkerOS } from '@walkeros/core';
import {
  getFlowSettings,
  getRouteGraph,
  isObject,
  resolveContracts,
  validateStepEntry,
} from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';
import { validateEventAgainstContract } from '@walkeros/transformer-validate';
import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const { validateFlowConfig } = schemas;

interface FlowValidateOptions {
  flow?: string;
  /** When true, contract violations are reported as errors instead of warnings. */
  strict?: boolean;
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

  // 5b. CLI-specific: closed-schema check on every transformer entry.
  //     Delegates to @walkeros/core for a single source of truth.
  if (flows) {
    for (const [flowName, flowValue] of Object.entries(flows)) {
      if (!isObject(flowValue)) continue;
      const transformersValue = flowValue.transformers;
      if (!isObject(transformersValue)) continue;
      for (const [name, transformerValue] of Object.entries(
        transformersValue,
      )) {
        if (!isObject(transformerValue)) continue;
        const result = validateStepEntry(transformerValue, 'Transformer');
        if (!result.ok) {
          errors.push({
            path: `flows.${flowName}.transformers.${name}`,
            message: result.reason || 'Invalid transformer entry.',
            code: result.code,
          });
        }
      }
    }
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

  // 10. CLI-specific: route checks on every chain field, read through
  //     core's getRouteGraph. Unknown targets are errors; shapes the schema
  //     accepts but the author probably did not intend are warnings. Runs
  //     only when there are no schema errors so we operate on shapes core
  //     has already validated.
  if (errors.length === 0 && isFlowJson(input)) {
    const typedFlows: Record<string, Flow> = input.flows;
    const flowsToLint = options.flow
      ? options.flow in typedFlows
        ? [options.flow]
        : []
      : Object.keys(typedFlows);

    for (const name of flowsToLint) {
      const flowSettings = typedFlows[name];
      if (!flowSettings) continue;
      lintFlowRoutes(name, flowSettings, errors, warnings);
    }
  }

  // 10b. Deep validation: cross-step example compatibility (typed Flow.Json shape)
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
        checkContractCompliance(
          flowSettings,
          contract,
          errors,
          warnings,
          options.strict === true,
        );
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
        // $var / etc.) are already reported by the schema/reference checker
        // above and should not double-fail this pass.
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

/**
 * Every transformer id a route can reach, read through core's
 * `getRouteGraph` (the one enumerator over the compiled route form). An
 * over-approximation by design: static validation has no event, so every
 * branch counts.
 */
function routeTargets(spec: Transformer.Route | undefined): string[] {
  if (spec === undefined) return [];
  const targets = new Set<string>();
  for (const node of getRouteGraph(spec)) {
    for (const target of node.targets) targets.add(target);
  }
  return [...targets];
}

function buildConnectionGraph(config: Flow): StepConnection[] {
  const connections: StepConnection[] = [];

  // Source → next transformer
  for (const [name, source] of Object.entries(config.sources || {})) {
    if (!source.next || !source.examples) continue;
    const nextNames = routeTargets(source.next);
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
    const nextNames = routeTargets(transformer.next);
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
    const beforeNames = routeTargets(dest.before);
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
    .filter(([, ex]) => hasComparableOut(ex.out))
    .map(([name, ex]) => ({ name, value: ex.out }));

  // A command example's `in` is a walker command payload, never a pushed event
  const toIns = Object.entries(conn.to.examples)
    .filter(([, ex]) => ex.in !== undefined && !ex.command)
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

/**
 * An `out` takes part in the compatibility check when it is a non-empty array
 * or string, or a non-empty object such as a single walkerOS event.
 */
function hasComparableOut(out: unknown): boolean {
  if (Array.isArray(out) || typeof out === 'string') return out.length > 0;
  return isObject(out) && Object.keys(out).length > 0;
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

/**
 * Checks every chain field of a flow (source `before`/`next`, transformer
 * `before`/`next`, destination `before`/`next`, `collector.next`):
 *
 * - error: a route target that is not a transformer of the flow. At runtime
 *   an unknown id is skipped with a warning, so a misspelled step (for
 *   example a redaction branch) would otherwise fail open.
 * - warning: entries after an unconditional `stop` never run.
 * - warning: `many: []` selects nothing; `many: ["x"]` is just `next`.
 * - warning: an array made only of route configs is first-match.
 */
function lintFlowRoutes(
  flowName: string,
  flow: Flow,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const known = new Set(Object.keys(flow.transformers || {}));
  const check = (
    spec: Transformer.Route | undefined,
    position: string,
  ): void => {
    if (spec !== undefined) lintRoute(spec, position, known, errors, warnings);
  };
  const at = `flows.${flowName}`;

  for (const [name, source] of Object.entries(flow.sources || {})) {
    check(source.before, `${at}.sources.${name}.before`);
    check(source.next, `${at}.sources.${name}.next`);
  }
  for (const [name, transformer] of Object.entries(flow.transformers || {})) {
    check(transformer.before, `${at}.transformers.${name}.before`);
    check(transformer.next, `${at}.transformers.${name}.next`);
  }
  check(flow.collector?.next, `${at}.collector.next`);
  for (const [name, dest] of Object.entries(flow.destinations || {})) {
    check(dest.before, `${at}.destinations.${name}.before`);
    check(dest.next, `${at}.destinations.${name}.next`);
  }
}

type RoutePath = (string | number)[];

/** The raw value at `path` inside a route (a plain lookup, no grammar). */
function routeAt(spec: Transformer.Route, path: RoutePath): unknown {
  let current: unknown = spec;
  for (const key of path) {
    if (typeof key === 'number')
      current = Array.isArray(current) ? current[key] : undefined;
    else current = isObject(current) ? current[key] : undefined;
  }
  return current;
}

/**
 * Lints one route through `getRouteGraph`. Every branch node, and every
 * enclosing decision it lists in `via`, is looked at once by its path.
 */
function lintRoute(
  spec: Transformer.Route,
  position: string,
  known: Set<string>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const where = (path: RoutePath) =>
    path.length > 0 ? `${position}.${path.join('.')}` : position;
  const reported = new Set<string>();
  const once = (key: string): boolean => {
    if (reported.has(key)) return false;
    reported.add(key);
    return true;
  };

  for (const node of getRouteGraph(spec)) {
    for (const target of node.targets) {
      if (known.has(target) || !once(`unknown:${target}`)) continue;
      errors.push({
        path: position,
        message: `Unknown transformer "${target}" in route at ${position}`,
        code: 'UNKNOWN_ROUTE_TARGET',
      });
    }

    // Entries after an unconditional stop never run (a `many` entry's stop
    // ends only its own copy, so it does not shadow its siblings).
    const last = node.path[node.path.length - 1];
    if (node.stop && !node.match && node.kind !== 'many') {
      const self = routeAt(spec, node.path);
      const list = routeAt(spec, node.path.slice(0, -1));
      if (
        isObject(self) &&
        self.stop === true &&
        typeof last === 'number' &&
        Array.isArray(list) &&
        last < list.length - 1 &&
        once(`stop:${where(node.path)}`)
      ) {
        const at = where(node.path);
        warnings.push({
          path: at,
          message: `dead code after stop at ${at}: entries after an unconditional stop never run`,
          suggestion:
            'Remove the entries after the stop, or give the stop a match.',
        });
      }
    }

    if (
      node.kind === 'many' &&
      last === 'many' &&
      node.targets.length === 0 &&
      once(`empty:${where(node.path)}`)
    ) {
      const at = where(node.path.slice(0, -1));
      warnings.push({
        path: at,
        message: `empty many at ${at}: selects no branch, so it has no effect`,
        suggestion: 'Add two or more branch targets to many, or remove it.',
      });
    }

    for (const decision of [...(node.via ?? []), node]) {
      const index = decision.path[decision.path.length - 1];
      if (typeof index !== 'number') continue;
      const listPath = decision.path.slice(0, -1);
      const list = routeAt(spec, listPath);
      if (!Array.isArray(list)) continue;
      const at = where(listPath);

      if (
        decision.kind === 'many' &&
        list.length === 1 &&
        once(`single:${at}`)
      ) {
        const only = list[0];
        const hint =
          typeof only === 'string'
            ? `use 'next: "${only}"' for clarity`
            : `use 'next' for clarity`;
        warnings.push({
          path: at,
          message: `single-entry many at ${at}: ${hint}`,
          suggestion: 'Replace many with next when only one branch exists.',
        });
      }

      // A pure route-config array is compiled as an implicit `one`.
      const explicitOne = listPath[listPath.length - 1] === 'one';
      if (
        decision.kind === 'one' &&
        !explicitOne &&
        list.length > 1 &&
        once(`first-match:${at}`)
      ) {
        warnings.push({
          path: at,
          message: `first-match array at ${at}: an array made only of route configs is an implicit one, the first matching entry wins`,
          suggestion:
            'Write { "one": [...] } explicitly, or add the step ids as a sequence to run every entry in order.',
        });
      }
    }
  }
}

/**
 * Validate each step example against the flow's resolved top-level contract.
 *
 * - A contract violation → error when {@link strict}, else warning.
 * - An entity.action with no matching contract entry produces NO diagnostic:
 *   the shared {@link validateEventAgainstContract} authority treats no-match
 *   as "no opinion = pass", and so do we. Emitting a warning here would wrongly
 *   fail `walkeros validate --strict` for any event type the contract simply
 *   does not cover.
 *
 * Only the canonical event INPUTS are validated: `destination.in` and
 * `transformer.in`. A source example's `in` is RAW input (an HTTP request, a
 * dataLayer array, an HTML string), not a canonical walkerOS event, so
 * validating it against the event contract would be semantically wrong.
 * Source-input validation (per-package input formats) and canonical-output
 * validation (`source.out`/`transformer.out`, which are `StepOut` effect
 * tuples, not events) are deferred to v2.
 *
 * The verdict comes from the shared {@link validateEventAgainstContract}
 * authority so design-time and runtime stay in lockstep.
 */
function checkContractCompliance(
  config: Flow,
  contract: Flow.Contract,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  strict: boolean,
): void {
  // Resolve extend chains + wildcards once; each rule is a ContractSource.
  const resolved = resolveContracts(contract);
  const rules = Object.values(resolved);
  if (rules.length === 0) return;

  const checkExample = (path: string, candidate: unknown): void => {
    if (!isObject(candidate)) return;

    const entity =
      typeof candidate.entity === 'string' ? candidate.entity : undefined;
    const action =
      typeof candidate.action === 'string' ? candidate.action : undefined;
    if (!entity || !action) return;

    const event: WalkerOS.DeepPartialEvent = candidate;
    const result = validateEventAgainstContract(event, undefined, {
      contracts: rules,
    });
    // No-match returns isValid:true (no opinion = pass), so an uncovered
    // event type produces no diagnostic, matching runtime semantics.
    if (result.isValid) return;

    const message = `Example violates contract: ${result.errors
      .map((e) => `${e.path || '/'}: ${e.message}`)
      .join('; ')}`;

    if (strict) {
      errors.push({ path, message, code: 'CONTRACT_VIOLATION' });
    } else {
      warnings.push({
        path,
        message,
        suggestion: 'Fix the example data to satisfy the contract schema.',
      });
    }
  };

  for (const [name, dest] of Object.entries(config.destinations || {})) {
    if (!dest.examples) continue;
    for (const [exName, example] of Object.entries(dest.examples)) {
      checkExample(`destination.${name}.examples.${exName}.in`, example.in);
    }
  }

  for (const [name, transformer] of Object.entries(config.transformers || {})) {
    if (!transformer.examples) continue;
    for (const [exName, example] of Object.entries(transformer.examples)) {
      checkExample(`transformer.${name}.examples.${exName}.in`, example.in);
    }
  }
}

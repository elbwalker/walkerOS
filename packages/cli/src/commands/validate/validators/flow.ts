// walkerOS/packages/cli/src/commands/validate/validators/flow.ts

import type { Flow, Transformer, WalkerOS } from '@walkeros/core';
import {
  checkWindowCollector,
  ENV_MARKER_PREFIX,
  getByPath,
  getRouteGraph,
  isObject,
  REF_CONTRACT,
  resolveContracts,
  validateStepEntry,
} from '@walkeros/core';
import { schemas, validateFlowStructure } from '@walkeros/core/dev';
import {
  validateEventAgainstContract,
  type ContractSource,
} from '@walkeros/transformer-validate';
import {
  describeScope,
  ENTRY_SECTIONS,
  flowOfPath,
  isFlowJson,
  resolveScope,
  type ResolvedScope,
} from '../scope.js';
import type {
  ValidateCheck,
  ValidateDeferred,
  ValidateDetails,
  ValidateResult,
  ValidateSkip,
  ValidationError,
  ValidationWarning,
} from '../types.js';
import { validateContract } from './contract.js';
import { resolveFlow, type FlowResolution } from './resolve.js';
import {
  checkStepSettings,
  createSettingsContext,
  type CheckedPackage,
  type SettingsOutcome,
} from './settings.js';

const { validateFlowConfig } = schemas;

interface FlowValidateOptions {
  flow?: string;
  /** When true, contract violations are reported as errors instead of warnings. */
  strict?: boolean;
}

interface FlowPackageOptions extends FlowValidateOptions {
  /** Skip the package settings check (no network); named in the scope. */
  offline?: boolean;
  /** Directory local `path` packages resolve against (the input file's). */
  configDir?: string;
}

/** Removed packages: reported as a warning for one minor (D3), then errors. */
const DEPRECATED_PACKAGES: Record<string, string> = {
  '@walkeros/store-memory':
    'has been removed. Use the built-in cache by omitting cache.store, or remove the store declaration if it was only used as a cache target.',
};

/** Step sections without their own closed-schema check (transformers have one). */
const OPEN_STEP_KINDS = [
  ['destinations', 'Destination'],
  ['stores', 'Store'],
] as const;

/** Everything the synchronous checks produced, for the package pass. */
interface FlowRun {
  result: ValidateResult;
  scope: ResolvedScope;
  typed?: Flow.Json;
  resolved: Map<string, Flow>;
  checks: ValidateCheck[];
  skipped: ValidateSkip[];
  gate: (name: string) => string | undefined;
}

/**
 * Validate a flow file without the network: schema and references, the
 * root contract, the bundler's structural preflight, routes, examples and
 * resolution of every flow in scope. `validate()` adds the package settings
 * check on top (see {@link validateFlowWithPackages}).
 */
export function validateFlow(
  input: unknown,
  options: FlowValidateOptions = {},
): ValidateResult {
  return runFlowChecks(input, options).result;
}

/**
 * The whole-file run of `validate()`: {@link validateFlow} plus every step
 * with a `package` in scope checked against its package settings schema at
 * the pinned version. Findings are warnings for one minor (D3); a schema
 * that cannot be loaded is a skip; `offline` removes the check and says so.
 */
export async function validateFlowWithPackages(
  input: unknown,
  options: FlowPackageOptions = {},
): Promise<ValidateResult> {
  const run = runFlowChecks(input, options);
  const { result, scope } = run;
  if (options.offline) {
    const described = describeScope(scope, run.checks);
    described.offline = true;
    result.details.scope = described;
    return result;
  }

  run.checks.push('flow:package-settings');
  const context = createSettingsContext(options.configDir);
  const deferred: ValidateDeferred[] = [];
  const packages: CheckedPackage[] = [];
  // Checks run in parallel; outcomes are applied in step order afterwards,
  // so the result does not depend on which schema arrives first.
  const pending: Array<Promise<SettingsOutcome>> = [];
  for (const name of scope.flows) {
    const flow = run.resolved.get(name);
    const rawFlow = run.typed?.flows[name];
    const reason = run.gate(name);
    if (!flow || !rawFlow || reason) {
      run.skipped.push({
        path: `flows.${name}`,
        check: 'flow:package-settings',
        reason: reason ?? `flows.${name} did not resolve`,
        code: 'GATED_BY_ERRORS',
      });
      continue;
    }
    for (const section of ENTRY_SECTIONS) {
      const steps = isObject(rawFlow[section]) ? rawFlow[section] : {};
      for (const [key, entry] of Object.entries(steps)) {
        if (!isObject(entry) || entry.package === undefined) continue;
        const target = { flow: name, section, key, entry };
        pending.push(
          checkStepSettings(
            target,
            flow,
            rawFlow,
            'flow:package-settings',
            context,
          ),
        );
      }
    }
  }
  for (const outcome of await Promise.all(pending)) {
    result.warnings.push(...outcome.findings);
    run.skipped.push(...outcome.skipped);
    deferred.push(...outcome.deferred);
    if (outcome.checked) packages.push(outcome.checked);
  }

  result.details.scope = describeScope(scope, run.checks);
  result.details.deferred = [...(result.details.deferred ?? []), ...deferred];
  if (packages.length > 0) result.details.packages = packages;
  return result;
}

function runFlowChecks(input: unknown, options: FlowValidateOptions): FlowRun {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const skipped: ValidateSkip[] = [];
  const checks: ValidateCheck[] = ['file:schema', 'flow:schema'];
  const details: ValidateDetails = {};
  const resolved = new Map<string, Flow>();
  // `valid` is set once every error-producing check has run; the package
  // pass only adds warnings and skips.
  const result: ValidateResult = {
    valid: false,
    type: 'flow',
    errors,
    warnings,
    details,
  };

  // 1. Serialize to JSON for core validator
  //    Core's validateFlowConfig takes a JSON string, but CLI receives parsed objects.
  //    Re-serializing is the bridge between the two interfaces.
  let json: string;
  const scope = resolveScope(input, { flow: options.flow });
  try {
    json = JSON.stringify(input, null, 2);
  } catch {
    errors.push({
      path: 'root',
      message: 'Input cannot be serialized to JSON',
      code: 'SERIALIZATION_ERROR',
    });
    return {
      result,
      scope,
      resolved,
      checks,
      skipped,
      gate: () => 'the input cannot be serialized',
    };
  }

  // 2. Scope: every per-flow check below runs on scope.flows only.
  errors.push(...scope.errors);
  const config: Record<string, unknown> = isObject(input) ? input : {};
  const flowsValue = config.flows;
  const flows: Record<string, unknown> | undefined = isObject(flowsValue)
    ? flowsValue
    : undefined;
  const allFlows = scope.allFlows;
  const inScope = (path: string): boolean => {
    const flow = flowOfPath(path, allFlows);
    return flow === undefined || scope.flows.includes(flow);
  };

  // 3. The root contract, validated as `-t contract` validates it, with
  //    paths under `contract.`. A file-level check: it runs whatever --flow.
  let contractErrors = 0;
  if ('contract' in config) {
    checks.push('file:contract');
    const contract = validateContract(config.contract);
    contractErrors = contract.errors.length;
    for (const error of contract.errors)
      errors.push({ ...error, path: `contract.${error.path}` });
    for (const warning of contract.warnings)
      warnings.push({ ...warning, path: `contract.${warning.path}` });
  }

  // 4. Run core validation (Zod schema + reference checking). File-level
  //    findings always count; per-flow findings only for flows in scope.
  //    Core's own contract-resolution error at `contract` is the same
  //    finding the contract check above already reported in detail.
  const coreResult = validateFlowConfig(json);
  for (const issue of coreResult.errors) {
    const path = issue.path || 'root';
    if (!inScope(path)) continue;
    if (path === 'contract' && contractErrors > 0) continue;
    errors.push({ path, message: issue.message, code: 'SCHEMA_VALIDATION' });
  }
  for (const issue of coreResult.warnings) {
    const path = issue.path || 'root';
    if (!inScope(path)) continue;
    warnings.push({ path, message: issue.message, code: 'CONFIG_WARNING' });
  }

  // 5. CLI-specific: check for empty flows
  if (flows && allFlows.length === 0) {
    errors.push({
      path: 'flows',
      message: 'At least one flow is required',
      code: 'EMPTY_FLOWS',
    });
  }

  // 6. Step entries. Transformers are closed (errors, single source of
  //    truth in @walkeros/core); an unknown key on a destination or store is
  //    dropped by the resolver, so it warns (UNKNOWN_KEY) for one minor.
  //    Removed packages warn (DEPRECATED_PACKAGE) for one minor (D3).
  checks.push('flow:steps');
  for (const flowName of scope.flows) {
    const flowValue = flows?.[flowName];
    if (!isObject(flowValue)) continue;
    const transformersValue = flowValue.transformers;
    if (isObject(transformersValue)) {
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
    for (const [section, kind] of OPEN_STEP_KINDS) {
      const steps = flowValue[section];
      if (!isObject(steps)) continue;
      for (const [name, step] of Object.entries(steps)) {
        if (!isObject(step)) continue;
        const at = `flows.${flowName}.${section}.${name}`;
        for (const key of unknownStepKeys(step, kind)) {
          warnings.push({
            path: `${at}.${key}`,
            message: `Unknown key "${key}" on ${kind} is ignored by the runtime`,
            suggestion: 'Remove the key, or move it to where it belongs.',
            code: 'UNKNOWN_KEY',
          });
        }
        const pkg = step.package;
        if (typeof pkg === 'string' && pkg in DEPRECATED_PACKAGES) {
          warnings.push({
            path: at,
            message: `${kind} "${name}" uses ${pkg}, which ${DEPRECATED_PACKAGES[pkg]}`,
            code: 'DEPRECATED_PACKAGE',
          });
        }
      }
    }
  }

  // 7. Extract flow details
  if (flows) {
    details.flowNames = allFlows;
    details.flowCount = allFlows.length;
  }

  // 8. CLI-specific: warn about packages without version (per-flow config.bundle.packages)
  checks.push('flow:package-versions');
  let totalPackageCount = 0;
  for (const flowName of scope.flows) {
    const flowValue = flows?.[flowName];
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
          code: 'PACKAGE_VERSION_MISSING',
        });
      }
    }
    totalPackageCount += Object.keys(packages).length;
  }
  if (totalPackageCount > 0) {
    details.packageCount = totalPackageCount;
  }

  // 9. Expose core's IntelliSense context in details (bonus for MCP consumers)
  if (coreResult.context) {
    details.context = coreResult.context;
  }

  // 10. Deep checks run per flow on shapes core has already validated: a
  //     flow with its own errors, or a file with file-level errors (its
  //     shape, its contract), skips them, and every skip is listed.
  const typed = isFlowJson(input) ? input : undefined;
  const gate = (name: string): string | undefined => {
    if (
      !typed ||
      errors.some((e) => flowOfPath(e.path, allFlows) === undefined)
    )
      return 'file-level errors: the file shape or its contract is not valid';
    if (errors.some((e) => flowOfPath(e.path, allFlows) === name))
      return `earlier errors in flows.${name}`;
    return undefined;
  };
  const perFlow = (
    stageChecks: ValidateCheck[],
    run: (name: string, flow: Flow, file: Flow.Json) => void,
  ): void => {
    checks.push(...stageChecks);
    for (const name of scope.flows) {
      const reason = gate(name);
      const flow = typed?.flows[name];
      if (reason || !typed || !flow) {
        for (const check of stageChecks) {
          skipped.push({
            path: `flows.${name}`,
            check,
            reason: reason ?? `flows.${name} is not a flow object`,
            code: 'GATED_BY_ERRORS',
          });
        }
        continue;
      }
      run(name, flow, typed);
    }
  };

  // 10a. The bundler's own structural preflight (identifier names, package
  //      xor code, per-flow $store targets), so a valid result implies the
  //      bundle preflight passes. Its warnings (a transformer mapping that
  //      does nothing) stay warnings: the runtime keeps the step.
  perFlow(['flow:structure'], (name, flow, file) => {
    const structure = validateFlowStructure({
      ...file,
      flows: { [name]: flow },
    });
    errors.push(...structure.errors);
    warnings.push(...structure.warnings);
  });

  // 10b. Route checks on every chain field, read through core's
  //      getRouteGraph. Unknown targets are errors; shapes the schema
  //      accepts but the author probably did not intend are warnings.
  perFlow(['flow:routes'], (name, flow) => {
    lintFlowRoutes(name, flow, errors, warnings);
  });

  // Each flow is resolved once, as the bundler resolves it: the validate
  // step check below reads its settings from there, 10d reports failures.
  const resolutions = new Map<string, FlowResolution>();
  const resolutionOf = (name: string, file: Flow.Json): FlowResolution => {
    let resolution = resolutions.get(name);
    if (!resolution) {
      resolution = resolveFlow(file, name);
      resolutions.set(name, resolution);
    }
    return resolution;
  };

  // 10c. Cross-step example compatibility, validate step examples against
  //      their contract, and flat dot-separated mapping keys.
  let totalConnections: number | undefined;
  perFlow(
    ['flow:examples', 'flow:contract-examples', 'flow:mapping-keys'],
    (name, flow, file) => {
      const connections = buildConnectionGraph(flow);
      for (const conn of connections) {
        checkCompatibility(name, conn, errors, warnings);
      }
      totalConnections = (totalConnections ?? 0) + connections.length;

      // Contracts bind only where a transformer-validate step links them,
      // with exactly that step's settings, as at runtime. The config-level
      // contract block binds nothing by itself.
      const resolution = resolutionOf(name, file);
      for (const [stepName, transformer] of Object.entries(
        flow.transformers || {},
      )) {
        if (!isValidateStep(transformer)) continue;
        const resolvedConfig = resolution.ok
          ? resolution.flow.transformers?.[stepName]?.config
          : undefined;
        checkValidateStepExamples(
          `flows.${name}.transformers.${stepName}`,
          transformer,
          file.contract,
          errors,
          warnings,
          options.strict === true,
          skipped,
          isObject(resolvedConfig) && isObject(resolvedConfig.settings)
            ? resolvedConfig.settings
            : undefined,
        );
      }

      for (const [destName, dest] of Object.entries(flow.destinations || {})) {
        if (!isObject(dest.config)) continue;
        const mapping = dest.config.mapping;
        if (!isObject(mapping)) continue;

        for (const key of Object.keys(mapping)) {
          if (key.includes('.') && !key.includes(' ')) {
            const parts = key.split('.');
            warnings.push({
              path: `flows.${name}.destinations.${destName}.config.mapping`,
              message: `Mapping key "${key}" looks like dot-notation. Mapping uses nested entity → action structure.`,
              suggestion: `Use nested format: { "${parts[0]}": { "${parts.slice(1).join('.')}": { ... } } }`,
              code: 'MAPPING_DOT_KEY',
            });
          }
        }
      }
    },
  );
  if (totalConnections !== undefined) {
    details.connectionsChecked = totalConnections;
  }

  // 10d. Resolve every flow as the bundler does. Every resolver failure
  //      (unknown $var, unresolvable $flow, unknown contract, cycles) is an
  //      error, since the bundle of that flow fails the same way. Values
  //      known only at runtime ($env without default, $secret) stay deferred.
  //      The collector global is checked on its resolved value; an `$env`
  //      value is known only at build time and stays deferred.
  const deferred: ValidateDeferred[] = [];
  perFlow(['flow:resolve'], (name, flow, file) => {
    const resolution = resolutionOf(name, file);
    if (!resolution.ok) {
      errors.push(resolution.error);
      return;
    }
    resolved.set(name, resolution.flow);
    checkResolvedWindowCollector(name, flow, resolution.flow, errors, deferred);
  });

  details.scope = describeScope(scope, checks);
  details.skipped = skipped;
  details.deferred = deferred;
  result.valid = errors.length === 0;

  return {
    result,
    scope,
    typed,
    resolved,
    checks,
    skipped,
    gate,
  };
}

/**
 * A `$var` / `$env` collector global, checked on its resolved value as the
 * build checks it. A literal is already checked by the schema; a value that
 * needs the build env is deferred to the build.
 */
function checkResolvedWindowCollector(
  name: string,
  raw: Flow,
  flow: Flow,
  errors: ValidationError[],
  deferred: ValidateDeferred[],
): void {
  const written = raw.config?.settings?.windowCollector;
  const value = flow.config?.settings?.windowCollector;
  if (
    flow.config?.platform !== 'web' ||
    typeof written !== 'string' ||
    !/\$(?:var|env)\./.test(written)
  )
    return;
  const path = `flows.${name}.config.settings.windowCollector`;
  if (typeof value === 'string' && value.includes(ENV_MARKER_PREFIX)) {
    deferred.push({ path, reference: written });
    return;
  }
  const check = checkWindowCollector(value);
  if (check.ok) return;
  errors.push({
    path,
    message: `${JSON.stringify(written)} resolved to ${JSON.stringify(value)}, which ${check.reason}`,
    code: 'SCHEMA_VALIDATION',
  });
}

/**
 * Top-level keys of a destination or store that the runtime does not know,
 * read through core's closed step-entry check (one source of truth).
 */
function unknownStepKeys(
  step: Record<string, unknown>,
  kind: 'Destination' | 'Store',
): string[] {
  const unknown: string[] = [];
  const rest: Record<string, unknown> = { ...step };
  for (;;) {
    const verdict = validateStepEntry(rest, kind);
    if (verdict.code !== 'UNKNOWN_KEY' || verdict.key === undefined) break;
    unknown.push(verdict.key);
    Reflect.deleteProperty(rest, verdict.key);
  }
  return unknown;
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
  flowName: string,
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

  const path = `flows.${flowName}.${conn.from.type}s.${conn.from.name} → ${conn.to.type}s.${conn.to.name}`;

  if (fromOuts.length === 0 || toIns.length === 0) {
    warnings.push({
      path,
      message: 'Cannot check compatibility: missing out or in examples',
      suggestion:
        'Add out examples to the source step or in examples to the target step',
      code: 'EXAMPLES_INCOMPLETE',
    });
    return;
  }

  const hasMatch = fromOuts.some((out) =>
    outEvents(out.value).some((event) =>
      toIns.some((inp) => isStructurallyCompatible(event, inp.value)),
    ),
  );

  if (!hasMatch) {
    errors.push({
      path,
      message: 'No compatible out/in pair found between connected steps',
      code: 'INCOMPATIBLE_EXAMPLES',
    });
  }
}

/** An effect tuple of a StepOut: a string head, then the call arguments. */
type StepOutEffect = [string, ...unknown[]];

/**
 * A StepOut is an array whose every entry is an array with a string head
 * (`[]` included): `[['elb', event]]`, `[['return', { event }]]`, ...
 */
function isStepOut(value: unknown): value is StepOutEffect[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => Array.isArray(entry) && typeof entry[0] === 'string')
  );
}

/**
 * Events a `return` effect passes on: `{ event }` yields the event, a bare
 * object is the event itself, an array is a fan-out read item by item by the
 * same rule. `false` and other values pass nothing on.
 */
function returnedEvents(value: unknown): unknown[] {
  if (isObject(value)) return [isObject(value.event) ? value.event : value];
  if (Array.isArray(value)) return value.flatMap(returnedEvents);
  return [];
}

/**
 * The events an example `out` hands to the next step. A StepOut yields the
 * object argument of each `elb` effect and the events of each `return`
 * effect; every other head (`message.ack`, `response`, vendor calls) yields
 * nothing. A non-StepOut value is the output itself (back compat), when it
 * is a non-empty array, string or object.
 */
function outEvents(out: unknown): unknown[] {
  if (isStepOut(out)) {
    return out.flatMap(([head, first]) => {
      if (head === 'elb') return isObject(first) ? [first] : [];
      if (head === 'return') return returnedEvents(first);
      return [];
    });
  }
  if (Array.isArray(out) || typeof out === 'string')
    return out.length > 0 ? [out] : [];
  return isObject(out) && Object.keys(out).length > 0 ? [out] : [];
}

function hasComparableOut(out: unknown): boolean {
  return outEvents(out).length > 0;
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
          code: 'ROUTE_DEAD_CODE',
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
        code: 'ROUTE_EMPTY_MANY',
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
          code: 'ROUTE_SINGLE_MANY',
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
          code: 'ROUTE_FIRST_MATCH',
          suggestion:
            'Write { "one": [...] } explicitly, or add the step ids as a sequence to run every entry in order.',
        });
      }
    }
  }
}

const VALIDATE_PACKAGE = '@walkeros/transformer-validate';

/** A transformer step that runs `@walkeros/transformer-validate`. */
export function isValidateStep(step: Flow.Transformer): boolean {
  return step.package === VALIDATE_PACKAGE;
}

type StepContracts =
  | { ok: true; sources: ContractSource[] }
  | { ok: false; index?: number; message: string };

/**
 * The contract sources a validate step runs with, as at runtime: a whole
 * `$contract.<name>(.<path>)` string resolves against the config-level
 * contract definitions, an inline schema is used as given. An entry that
 * does not resolve says which one and why; the step is then not judged.
 */
function resolveStepContracts(
  entries: unknown[],
  contract: Flow.Contract | undefined,
): StepContracts {
  let resolved: Record<string, Flow.ContractRule> = {};
  if (contract) {
    try {
      resolved = resolveContracts(contract);
    } catch (error) {
      return {
        ok: false,
        message: `the root contract does not resolve (${error instanceof Error ? error.message : String(error)})`,
      };
    }
  }

  const sources: ContractSource[] = [];
  for (const [index, entry] of entries.entries()) {
    if (isObject(entry)) {
      sources.push(entry);
      continue;
    }
    const match = typeof entry === 'string' ? entry.match(REF_CONTRACT) : null;
    if (!match)
      return {
        ok: false,
        index,
        message: 'an entry must be a $contract reference or a JSON Schema',
      };
    if (!(match[1] in resolved))
      return {
        ok: false,
        index,
        message: `contract "${match[1]}" is not defined in the root contract (defined: ${Object.keys(resolved).join(', ') || 'none'})`,
      };
    const rule: unknown = match[2]
      ? getByPath(resolved[match[1]], match[2])
      : resolved[match[1]];
    if (!isObject(rule))
      return {
        ok: false,
        index,
        message: `${match[0]} does not point at a contract rule object`,
      };
    sources.push(rule);
  }
  return { ok: true, sources };
}

/**
 * Check a validate step's own examples against its own contract and
 * settings: the verdict the step reaches on `in` must agree with what `out`
 * shows. A valid event goes on (its `output.isValid` flag, when shown, is
 * true); an invalid one is dropped in `strict` mode and otherwise goes on
 * with the flag false. A disagreement is CONTRACT_VIOLATION (error when
 * {@link strict}, else warning). Deterministic: the verdict comes from the
 * shared {@link validateEventAgainstContract} runtime authority.
 * `stepPath` is the step's result path, `flows.<flow>.transformers.<name>`.
 * A contract entry that does not resolve is an error (UNRESOLVED_CONTRACT),
 * examples or not; a contract setting that is not a list is a skip.
 * `resolvedSettings` are the step's settings as the resolver produced them
 * (`$var` and `$contract` resolved, as the runtime sees them); without them
 * the settings as written are read.
 */
export function checkValidateStepExamples(
  stepPath: string,
  step: Flow.Transformer,
  contract: Flow.Contract | undefined,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  strict: boolean,
  skipped?: ValidateSkip[],
  resolvedSettings?: Record<string, unknown>,
): void {
  const settings =
    resolvedSettings ??
    (isObject(step.config) && isObject(step.config.settings)
      ? step.config.settings
      : {});
  const contractPath = `${stepPath}.config.settings.contract`;
  // A contract that is set but not a list cannot be judged statically.
  if (settings.contract !== undefined && !Array.isArray(settings.contract)) {
    if (step.examples)
      skipped?.push({
        path: stepPath,
        check: 'flow:contract-examples',
        reason:
          'config.settings.contract is not a list, so the step cannot be judged statically',
        code: 'CONTRACT_NOT_STATIC',
      });
    return;
  }
  const resolution: StepContracts = Array.isArray(settings.contract)
    ? resolveStepContracts(settings.contract, contract)
    : { ok: true, sources: [] };
  if (!resolution.ok) {
    errors.push({
      path:
        resolution.index === undefined
          ? contractPath
          : `${contractPath}.${resolution.index}`,
      message: `The validate step's contract does not resolve: ${resolution.message}`,
      code: 'UNRESOLVED_CONTRACT',
    });
    return;
  }
  if (!step.examples) return;
  const contracts = resolution.sources;

  const mode = settings.mode === 'strict' ? 'strict' : 'pass';
  const format = settings.format === true;
  const output = isObject(settings.output) ? settings.output : {};
  const isValidPath =
    typeof output.isValid === 'string' ? output.isValid : 'source.valid';

  for (const [exName, example] of Object.entries(step.examples)) {
    if (example.command || !isObject(example.in)) continue;
    if (example.out === undefined) continue;

    const event: WalkerOS.DeepPartialEvent = example.in;
    const verdict = validateEventAgainstContract(event, undefined, {
      contracts,
      format,
    });
    const passed = outEvents(example.out);
    const dropped =
      isStepOut(example.out) &&
      example.out.some(([head, first]) => head === 'return' && first === false);

    let agrees: boolean;
    if (mode === 'strict' && !verdict.isValid) {
      agrees = dropped && passed.length === 0;
    } else {
      agrees =
        passed.length > 0 &&
        passed.every((out) => {
          if (!isValidPath) return true;
          const flag = getByPath(out, isValidPath);
          return verdict.isValid ? flag !== false : flag === false;
        });
    }
    if (agrees) continue;

    const reason = verdict.isValid
      ? 'the event satisfies the contract'
      : `the event breaks the contract (${verdict.errors
          .map((e) => `${e.path || '/'}: ${e.message}`)
          .join('; ')})`;
    const expected =
      mode === 'strict' && !verdict.isValid
        ? 'drops it (["return", false])'
        : `passes it on${isValidPath ? ` with ${isValidPath} ${verdict.isValid}` : ''}`;
    const path = `${stepPath}.examples.${exName}.out`;
    const message = `Example out disagrees with the validate step: ${reason}, so with mode "${mode}" the step ${expected}.`;

    if (strict) {
      errors.push({ path, message, code: 'CONTRACT_VIOLATION' });
    } else {
      warnings.push({
        path,
        message,
        suggestion:
          'Make the example out show what the validate step does with its settings.',
        code: 'CONTRACT_VIOLATION',
      });
    }
  }
}

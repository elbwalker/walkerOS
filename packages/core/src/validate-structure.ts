import type { Flow } from './types/flow';
import { isArray, isObject } from './is';
import { getUnknownStepKeys, validateStepEntry } from './step-entry';
import {
  getTransformerMapping,
  getTransformerMappingWarnings,
} from './transformer-mapping';
import {
  getMappingKeyPaths,
  getMappingNoOpMessage,
  getMappingNoOpPaths,
} from './mapping-no-ops';
import { VALUE_KEYS, VALUE_PRODUCERS } from './mappingValue';
import {
  findMalformedReferences,
  MALFORMED_REFERENCE,
} from './schemas/validate-flow-config';
import { ConfigSchema as SourceConfigSchema } from './schemas/source';
import { ConfigSchema as TransformerConfigSchema } from './schemas/transformer';
import { ConfigSchema as DestinationConfigSchema } from './schemas/destination';
import { ConfigSchema as StoreConfigSchema } from './schemas/store';
import { InitConfigSchema as CollectorInitConfigSchema } from './schemas/collector';
import {
  validateComponentNames,
  validateReference,
  validateStoreReferences,
} from './structural-validators';

export type ValidationType = 'contract' | 'event' | 'flow' | 'mapping';

export type ValidateResultType = ValidationType | 'entry';

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  code?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
  code?: string;
}

export interface ValidateResult {
  valid: boolean;
  type: ValidateResultType;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  details: Record<string, unknown>;
}

const STEP_SECTIONS = [
  'sources',
  'destinations',
  'transformers',
  'stores',
] as const;

type StepSection = (typeof STEP_SECTIONS)[number];

const SECTION_TO_KIND: Record<StepSection, Flow.StepKind> = {
  sources: 'Source',
  destinations: 'Destination',
  transformers: 'Transformer',
  stores: 'Store',
};

function getSection(
  flow: Flow,
  section: StepSection,
): Record<string, Flow.Step> | undefined {
  switch (section) {
    case 'sources':
      return flow.sources;
    case 'destinations':
      return flow.destinations;
    case 'transformers':
      return flow.transformers;
    case 'stores':
      return flow.stores;
  }
}

function hasCodeReference(code: unknown): boolean {
  if (typeof code === 'string') return true;
  return isObject(code) && 'push' in code;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const STATE_SECTIONS = ['sources', 'transformers', 'destinations'] as const;

/**
 * The keys a step's `config` may carry, per kind, read from core's config
 * schemas (kept equal to the config types by `config-drift.test-d.ts`).
 * Collector-owned: the runtime reads them by name and ignores any other.
 */
const CONFIG_KEYS: Record<Flow.StepKind, ReadonlyArray<string>> = {
  Source: Object.keys(SourceConfigSchema.shape),
  Transformer: Object.keys(TransformerConfigSchema.shape),
  Destination: Object.keys(DestinationConfigSchema.shape),
  Store: Object.keys(StoreConfigSchema.shape),
};

/** The keys a flow's `collector` block may carry (`Collector.InitConfig`). */
const COLLECTOR_KEYS: ReadonlyArray<string> = Object.keys(
  CollectorInitConfigSchema.shape,
);

function unknownKeyErrors(
  value: unknown,
  known: ReadonlyArray<string>,
  path: string,
  owner: string,
): ValidationError[] {
  if (!isObject(value)) return [];
  return Object.keys(value)
    .filter((key) => !known.includes(key))
    .map((key) => ({
      path: `${path}.${key}`,
      message: `Unknown key "${key}" in ${owner} is ignored by the runtime. Known keys: ${[...known].sort().join(', ')}.`,
      code: 'UNKNOWN_KEY',
    }));
}

/**
 * Unknown keys on a step entry and inside its `config`: both are owned by
 * the collector, which reads them by name, so a typo (`consentt`) would
 * silently have no effect. Step-level keys are checked here for
 * destinations and stores; a source is closed by the flow schema and a
 * transformer by {@link validateStepEntry}. `at` is the step's path.
 */
export function checkStepKeys(
  step: Record<string, unknown>,
  kind: Flow.StepKind,
  at: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (kind === 'Destination' || kind === 'Store') {
    for (const key of getUnknownStepKeys(step, kind)) {
      errors.push({
        path: `${at}.${key}`,
        message: `Unknown key "${key}" on ${kind} is ignored by the runtime. Remove the key, or move it to where it belongs.`,
        code: 'UNKNOWN_KEY',
      });
    }
  }
  errors.push(
    ...unknownKeyErrors(
      step.config,
      CONFIG_KEYS[kind],
      `${at}.config`,
      `${kind} config`,
    ),
  );
  return errors;
}

/**
 * Mapping value objects that do not do what they look like: an object
 * without an operator (`{ total: 'data.total' }` where `map` was meant) is
 * dropped at runtime, and of several producers only the first one runs.
 * Walks every value position of a mapping config (`data`, `policy`, each
 * rule's `data` and `policy`) and, for a source, `ingest`.
 */
function checkMappingValues(
  config: unknown,
  at: string,
  errors: ValidationError[],
): void {
  if (!isObject(config)) return;
  checkValue(config.data, `${at}.data`, errors);
  checkPolicy(config.policy, `${at}.policy`, errors);
  const rules = config.mapping;
  if (!isObject(rules)) return;
  for (const [entity, actions] of Object.entries(rules)) {
    if (!isObject(actions)) continue;
    for (const [action, value] of Object.entries(actions)) {
      const list: unknown[] = isArray(value) ? value : [value];
      list.forEach((rule, index) => {
        if (!isObject(rule)) return;
        const rulePath = `${at}.mapping.${entity}.${action}${
          isArray(value) ? `.${index}` : ''
        }`;
        checkValue(rule.data, `${rulePath}.data`, errors);
        checkPolicy(rule.policy, `${rulePath}.policy`, errors);
      });
    }
  }
}

function checkPolicy(
  policy: unknown,
  at: string,
  errors: ValidationError[],
): void {
  if (!isObject(policy)) return;
  for (const [key, value] of Object.entries(policy))
    checkValue(value, `${at}.${key}`, errors);
}

const PRODUCER_ORDER = VALUE_PRODUCERS.join(', ');

function checkValue(
  value: unknown,
  at: string,
  errors: ValidationError[],
): void {
  if (isArray(value)) {
    value.forEach((item, index) => checkValue(item, `${at}.${index}`, errors));
    return;
  }
  if (!isObject(value)) return;
  const keys = Object.keys(value);
  if (keys.length === 0) return;
  if (!VALUE_KEYS.some((key) => key in value)) {
    errors.push({
      path: at,
      message: `Mapping value has no operator (${keys.join(', ')}), so it is dropped at runtime. Wrap the fields in map ({ "map": { ... } }), or use key, value, fn, loop or set.`,
      code: 'MAPPING_VALUE_NO_OPERATOR',
    });
    return;
  }
  const producers = VALUE_PRODUCERS.filter((key) => value[key] !== undefined);
  if (producers.length > 1) {
    const [runs, ...never] = producers;
    errors.push({
      path: at,
      message: `${never.map((key) => `\`${key}\``).join(', ')} never ${
        never.length === 1 ? 'runs' : 'run'
      }: \`${runs}\` is this value's producer (one producer per value, tried in the order ${PRODUCER_ORDER}). Keep one producer; to transform a path, read it inside \`fn\`.`,
      code: 'MAPPING_VALUE_PRODUCERS',
    });
  }
  if (isObject(value.map))
    for (const [key, item] of Object.entries(value.map))
      checkValue(item, `${at}.map.${key}`, errors);
  if (isArray(value.set))
    value.set.forEach((item, index) =>
      checkValue(item, `${at}.set.${index}`, errors),
    );
  if (isArray(value.loop))
    value.loop.forEach((item, index) =>
      checkValue(item, `${at}.loop.${index}`, errors),
    );
}

/**
 * A `batch` on a destination whose inline `code` has no `pushBatch` has no
 * effect: events go to `push` one by one. Checked where the implementation
 * is known statically (inline code); a package step is checked at
 * registration.
 */
function checkInlineBatch(
  destination: Flow.Destination,
  at: string,
  errors: ValidationError[],
): void {
  const { code } = destination;
  if (!isObject(code) || code.pushBatch !== undefined) return;
  const paths = getMappingKeyPaths(destination.config, 'config', {
    config: ['batch'],
    rule: ['batch'],
  });
  if (paths.length === 0) return;
  errors.push({
    path: at,
    message: `${paths.map((path) => `\`${path}\``).join(', ')} ${
      paths.length === 1 ? 'has' : 'have'
    } no effect: the inline code has no \`pushBatch\`, so events go to \`push\` one by one. Add a \`pushBatch\` function to \`code\`, or remove the batch.`,
    code: 'BATCH_WITHOUT_PUSH_BATCH',
  });
}

/**
 * Every `state` entry (on the step or in its `config`) must name a store
 * declared in `flow.stores`, and that store may not be a `file: true` byte
 * store. An omitted store, `__cache` and `$` references are not checked.
 */
export function validateStateStores(
  flow: Flow,
  flowName: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const stores = flow.stores || {};

  const check = (entry: unknown, path: string) => {
    if (!isObject(entry) || typeof entry.store !== 'string') return;
    const id = entry.store;
    if (id.startsWith('$') || id === '__cache') return;
    const store = stores[id];
    if (!store) {
      errors.push({
        path,
        message: `State store "${id}" is not declared in flow.stores.`,
        code: 'STATE_STORE_UNKNOWN',
      });
      return;
    }
    if (isObject(store.config) && store.config.file === true) {
      errors.push({
        path,
        message: `State cannot use store "${id}": it sets file: true. Handle byte stores in a transformer.`,
        code: 'STATE_STORE_FILE',
      });
    }
  };

  const scan = (state: unknown, path: string) => {
    if (Array.isArray(state)) {
      state.forEach((entry, index) => check(entry, `${path}.${index}`));
    } else {
      check(state, path);
    }
  };

  for (const section of STATE_SECTIONS) {
    const steps = getSection(flow, section);
    if (!steps) continue;
    for (const [name, step] of Object.entries(steps)) {
      const base = `flows.${flowName}.${section}.${name}`;
      if ('state' in step) scan(step.state, `${base}.state`);
      if (isObject(step.config))
        scan(step.config.state, `${base}.config.state`);
    }
  }

  return errors;
}

/**
 * Pure structural validation of a flow config: the exact checks the bundler
 * runs at codegen time, BEFORE any esbuild compile or package/archive fetch.
 *
 * Runs synchronously and never touches the network, the filesystem, or
 * esbuild. Aggregates every structural problem instead of throwing on the
 * first one, so a single call surfaces all issues in a config.
 *
 * Checks performed per flow:
 * - component names are valid JavaScript identifiers (they become generated
 *   property names),
 * - each source/destination/store reference specifies exactly one of
 *   package or code, and each transformer entry is a closed, valid shape,
 * - every `$store.` reference points at a defined store,
 * - every `state` store is declared and is not a `file: true` store,
 * - no unknown key on a step entry, in a step's `config` or in the
 *   `collector` block (`UNKNOWN_KEY`),
 * - no mapping field that does nothing at its position (`MAPPING_NO_OP`),
 * - no mapping value object without an operator or with two producers,
 * - no `batch` on inline code without `pushBatch`,
 * - no whole-value reference that would ship as literal text
 *   (`MALFORMED_REFERENCE`).
 *
 * Intended for fast deploy preflight: catch a bad flow config in well under a
 * second without spinning up a container or compiling anything.
 */
export function validateFlowStructure(flowConfig: Flow.Json): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const details: Record<string, unknown> = {};

  const flows = flowConfig.flows;
  const flowNames = isObject(flows) ? Object.keys(flows) : [];
  details.flowNames = flowNames;
  details.flowCount = flowNames.length;

  if (!isObject(flows) || flowNames.length === 0) {
    errors.push({
      path: 'flows',
      message: 'At least one flow is required',
      code: 'EMPTY_FLOWS',
    });
    return { valid: false, type: 'flow', errors, warnings: [], details };
  }

  for (const [flowName, flow] of Object.entries(flows)) {
    // 1. Component names must be valid JS identifiers (per section).
    for (const section of STEP_SECTIONS) {
      const steps = getSection(flow, section);
      if (!steps) continue;
      try {
        validateComponentNames(steps, section);
      } catch (error) {
        errors.push({
          path: `flows.${flowName}.${section}`,
          message: messageOf(error),
          code: 'INVALID_COMPONENT_NAME',
        });
      }
    }

    // 2. Each reference must specify exactly one of package or code; each
    //    transformer entry must be a closed, valid shape.
    for (const section of STEP_SECTIONS) {
      const steps = getSection(flow, section);
      if (!steps) continue;
      const kind = SECTION_TO_KIND[section];
      // Transformers are checked via validateStepEntry in step 2b below, which
      // reports the precise core error code. Skip them here so a transformer
      // problem is not double-reported under a generic code.
      if (kind === 'Transformer') continue;
      for (const [name, ref] of Object.entries(steps)) {
        // The bundler only validates a store reference when it actually
        // declares a package or code (code-less stores are wired elsewhere);
        // mirror that gate so structural validation matches codegen.
        if (kind === 'Store' && !ref.package && !hasCodeReference(ref.code)) {
          continue;
        }
        try {
          validateReference(kind, name, ref);
        } catch (error) {
          errors.push({
            path: `flows.${flowName}.${section}.${name}`,
            message: messageOf(error),
            code: 'INVALID_REFERENCE',
          });
        }
      }
    }

    // 2b. Closed-schema check on every transformer entry (single source of
    //     truth in @walkeros/core), matching the CLI validate command.
    const transformers = flow.transformers;
    if (transformers) {
      for (const [name, transformer] of Object.entries(transformers)) {
        const path = `flows.${flowName}.transformers.${name}`;
        const result = validateStepEntry({ ...transformer }, 'Transformer');
        if (!result.ok) {
          errors.push({
            path,
            message: result.reason || 'Invalid transformer entry.',
            code: result.code,
          });
        }
        // A mapping that never runs, or fields in it that do nothing at the
        // transformer position. The runtime still runs the step and logs it
        // once at registration; validate and the bundle reject it.
        const { config } = transformer;
        const entry = {
          ...transformer,
          config: isObject(config) ? config : undefined,
        };
        for (const message of getTransformerMappingWarnings(entry)) {
          errors.push({ path, message, code: 'MAPPING_NO_OP' });
        }
        const mapping = getTransformerMapping(entry);
        const field =
          entry.config?.mapping !== undefined ? 'config.mapping' : 'mapping';
        checkMappingValues(mapping, `${path}.${field}`, errors);
      }
    }

    // 2c. Closed keys on every step and its config, the collector block,
    //     mapping fields that do nothing at their position (a transformer's
    //     are checked in 2b), mapping value objects, and a batch the inline
    //     code cannot honour.
    for (const section of STEP_SECTIONS) {
      const steps = getSection(flow, section);
      if (!steps) continue;
      const kind = SECTION_TO_KIND[section];
      for (const [name, step] of Object.entries(steps)) {
        const path = `flows.${flowName}.${section}.${name}`;
        errors.push(...checkStepKeys({ ...step }, kind, path));
        if (kind !== 'Source' && kind !== 'Destination') continue;
        const position = kind === 'Source' ? 'source' : 'destination';
        const noOps = getMappingNoOpPaths(position, step.config, 'config');
        if (noOps.length > 0)
          errors.push({
            path,
            message: getMappingNoOpMessage(position, noOps),
            code: 'MAPPING_NO_OP',
          });
        checkMappingValues(step.config, `${path}.config`, errors);
        if (isObject(step.config))
          checkValue(step.config.ingest, `${path}.config.ingest`, errors);
      }
    }
    for (const [name, destination] of Object.entries(flow.destinations || {})) {
      checkInlineBatch(
        destination,
        `flows.${flowName}.destinations.${name}`,
        errors,
      );
    }
    errors.push(
      ...unknownKeyErrors(
        flow.collector,
        COLLECTOR_KEYS,
        `flows.${flowName}.collector`,
        'collector config',
      ),
    );

    // 3. Every `$store.` reference must point at a defined store.
    const storeIds = new Set(Object.keys(flow.stores || {}));
    try {
      validateStoreReferences(flow, storeIds);
    } catch (error) {
      errors.push({
        path: `flows.${flowName}`,
        message: messageOf(error),
        code: 'STORE_REFERENCE_NOT_FOUND',
      });
    }

    // 4. Every `state` store must be declared and must not be a file store.
    errors.push(...validateStateStores(flow, flowName));
  }

  // 5. Whole-value references that would ship as literal text, the same
  //    check `validateFlowConfig` runs.
  for (const issue of findMalformedReferences(flowConfig)) {
    errors.push({
      path: issue.path,
      message: issue.message,
      code: MALFORMED_REFERENCE,
    });
  }

  return {
    valid: errors.length === 0,
    type: 'flow',
    errors,
    warnings,
    details,
  };
}

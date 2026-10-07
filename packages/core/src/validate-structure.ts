import type { Flow } from './types/flow';
import { isObject } from './is';
import { validateStepEntry } from './step-entry';
import { getTransformerMappingWarnings } from './transformer-mapping';
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
 * - every `state` store is declared and is not a `file: true` store.
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
        // A mapping that never runs, or fields in it that do nothing at
        // the transformer position, warn: rejecting would skip the step.
        const { config } = transformer;
        for (const message of getTransformerMappingWarnings({
          ...transformer,
          config: isObject(config) ? config : undefined,
        })) {
          warnings.push({ path, message, code: 'TRANSFORMER_MAPPING_NO_OP' });
        }
      }
    }

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

  return {
    valid: errors.length === 0,
    type: 'flow',
    errors,
    warnings,
    details,
  };
}

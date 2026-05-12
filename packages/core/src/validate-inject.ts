import type { Flow } from './types';
import type { RouteSpec } from './types/transformer';
import { clone } from './clone';

const VALIDATOR_PACKAGE = '@walkeros/transformer-validator';
const RESERVED_PREFIX = '__validate_';

type StepKind = 'source' | 'transformer' | 'destination';

/**
 * Detect step-level `validate:` declarations and rewrite the flow:
 *   1. Add `@walkeros/transformer-validator` to `config.bundle.packages`
 *   2. Inject named validator transformers into `flow.transformers`
 *   3. Wire each injected validator into the right chain on the consuming step
 *   4. Strip the `validate:` field from the original step
 *
 * Chain positioning (lifecycle Option B: after `before` chain, before main action):
 *   - Source:      prepend to `source.next`
 *   - Transformer: append to `transformer.before`
 *   - Destination: append to `destination.before`
 *
 * Collision: throws if a user-supplied transformer name already occupies
 * the generated `__validate_<kind>_<name>` slot, unless that slot is itself
 * a previously auto-injected validator (then re-running is idempotent).
 *
 * Pure: input flow is not mutated.
 */
export function autoInjectValidators(flow: Flow): Flow {
  const out = clone(flow);
  let injected = false;

  for (const stepName of Object.keys(out.sources ?? {})) {
    if (handleStep('source', stepName, out.sources![stepName], out))
      injected = true;
  }
  for (const stepName of Object.keys(out.transformers ?? {})) {
    if (handleStep('transformer', stepName, out.transformers![stepName], out))
      injected = true;
  }
  for (const stepName of Object.keys(out.destinations ?? {})) {
    if (handleStep('destination', stepName, out.destinations![stepName], out))
      injected = true;
  }

  if (injected) {
    out.config = out.config ?? { platform: 'web' };
    out.config.bundle = out.config.bundle ?? { packages: {} };
    out.config.bundle.packages = out.config.bundle.packages ?? {};
    if (!out.config.bundle.packages[VALIDATOR_PACKAGE]) {
      out.config.bundle.packages[VALIDATOR_PACKAGE] = {};
    }
  }

  return out;
}

function handleStep(
  kind: StepKind,
  stepName: string,
  step: Flow.Source | Flow.Transformer | Flow.Destination,
  flow: Flow,
): boolean {
  if (!step.validate) return false;

  const transformerName = `${RESERVED_PREFIX}${kind}_${stepName}`;

  flow.transformers = flow.transformers ?? {};

  const existing = flow.transformers[transformerName];
  if (existing) {
    // Idempotent re-run only if the existing slot is itself a prior auto-injected validator.
    const isAutoInjected = existing.package === VALIDATOR_PACKAGE;
    if (!isAutoInjected) {
      throw new Error(
        `Transformer name "${transformerName}" is reserved for step-level validate auto-injection.`,
      );
    }
  }

  flow.transformers[transformerName] = {
    package: VALIDATOR_PACKAGE,
    config: { settings: step.validate },
  };

  if (kind === 'source') {
    // `kind === 'source'` discriminates the union to Flow.Source, which uses `next`.
    const src = step as Flow.Source;
    src.next = prepend(src.next, transformerName);
  } else {
    // Transformer and Destination both use `before` for the pre-action chain.
    const sink = step as Flow.Transformer | Flow.Destination;
    sink.before = append(sink.before, transformerName);
  }

  delete step.validate;
  return true;
}

function prepend(chain: RouteSpec | undefined, name: string): RouteSpec {
  if (chain === undefined) return name;
  if (typeof chain === 'string') return [name, chain];
  if (Array.isArray(chain)) return [name, ...chain];
  // chain is a single RouteConfig object
  return [name, chain];
}

function append(chain: RouteSpec | undefined, name: string): RouteSpec {
  if (chain === undefined) return name;
  if (typeof chain === 'string') return [chain, name];
  if (Array.isArray(chain)) return [...chain, name];
  // chain is a single RouteConfig object
  return [chain, name];
}

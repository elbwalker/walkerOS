import {
  STEP_FIELD_ROLES,
  STEP_OPERATIVE_FIELDS,
  getStepFieldRole,
  getStepRuntimeProps,
} from '../step-entry';
import { getFlowSettings } from '../flow';
import type { Flow } from '../types/flow';
import type { State } from '../types/state';
import type { Cache } from '../types';

const kinds: Flow.StepKind[] = [
  'Source',
  'Transformer',
  'Destination',
  'Store',
];

const eventCache: Cache.Cache<Cache.EventCacheRule> = {
  rules: [{ ttl: 60, key: ['event.name'] }],
};
const state: State[] = [
  { mode: 'get', key: 'event.user.session', value: 'event.data.fetched' },
  { mode: 'set', key: 'event.user.session', value: 'event.data' },
];
const code: Flow.Code = { push: '$code:(event) => event' };
const examples: Flow.StepExamples = { basic: { in: { a: 1 } } };
const variables: Flow.Variables = { region: 'eu' };

// `Required<...>` makes each sample a compile-time drift guard: a new field on
// a Flow step interface fails to compile here until the sample carries it.
const source: Required<Flow.Source> = {
  package: '@walkeros/x',
  code,
  import: 'sourceX',
  config: { settings: { a: 1 } },
  env: { e: 1 },
  primary: true,
  before: 'pre',
  next: 'enrich',
  cache: eventCache,
  state,
  variables,
  examples,
};
const transformer: Required<Flow.Transformer> = {
  package: '@walkeros/x',
  code,
  import: 'transformerX',
  config: { settings: { a: 1 } },
  env: { e: 1 },
  before: 'pre',
  next: 'enrich',
  cache: eventCache,
  state,
  mapping: { mapping: { page: { view: { name: 'pv' } } } },
  variables,
  examples,
};
const destination: Required<Flow.Destination> = {
  package: '@walkeros/x',
  code,
  import: 'destinationX',
  config: { settings: { a: 1 } },
  env: { e: 1 },
  before: 'pre',
  next: 'post',
  cache: eventCache,
  state,
  variables,
  examples,
};
const store: Required<Flow.Store> = {
  package: '@walkeros/x',
  code,
  import: 'storeX',
  config: { settings: { a: 1 } },
  env: { e: 1 },
  cache: { rules: [{ ttl: 60 }] },
  variables,
  examples,
};

const samples: Record<Flow.StepKind, Record<string, unknown>> = {
  Source: source,
  Transformer: transformer,
  Destination: destination,
  Store: store,
};

describe('STEP_FIELD_ROLES', () => {
  it.each(kinds)(
    '%s: every operative field is a reference or runtime field',
    (kind) => {
      for (const field of STEP_OPERATIVE_FIELDS[kind]) {
        expect([field, getStepFieldRole(kind, field)]).toEqual([
          field,
          expect.stringMatching(/^(reference|runtime)$/),
        ]);
      }
    },
  );

  it.each(kinds)('%s: the sample carries every classified field', (kind) => {
    for (const field of Object.keys(STEP_FIELD_ROLES[kind])) {
      expect([field, samples[kind][field]]).not.toEqual([field, undefined]);
    }
  });

  it('returns undefined for an unclassified field', () => {
    expect(getStepFieldRole('Transformer', 'layout')).toBeUndefined();
  });
});

describe('getStepRuntimeProps', () => {
  it.each(kinds)('%s: keeps exactly the runtime fields', (kind) => {
    const props = getStepRuntimeProps(
      { ...samples[kind], layout: { x: 1 } },
      kind,
    );
    const runtime = Object.keys(STEP_FIELD_ROLES[kind]).filter(
      (field) => getStepFieldRole(kind, field) === 'runtime',
    );
    expect(Object.keys(props).sort()).toEqual(runtime.sort());
    for (const field of runtime) {
      expect(props[field]).toEqual(samples[kind][field]);
    }
  });
});

describe('getFlowSettings keeps every classified step field', () => {
  const setup: Flow.Json = {
    version: 4,
    flows: {
      default: {
        config: { platform: 'server' },
        sources: { s: source },
        transformers: { t: transformer },
        destinations: { d: destination },
        stores: { st: store },
      },
    },
  };
  const resolved = getFlowSettings(setup);
  const resolvedSteps: Record<Flow.StepKind, Record<string, unknown>> = {
    Source: { ...resolved.sources?.s },
    Transformer: { ...resolved.transformers?.t },
    Destination: { ...resolved.destinations?.d },
    Store: { ...resolved.stores?.st },
  };

  it.each(kinds)('%s: keeps non-docs fields, strips docs fields', (kind) => {
    for (const field of Object.keys(STEP_FIELD_ROLES[kind])) {
      const expected =
        getStepFieldRole(kind, field) === 'docs'
          ? undefined
          : samples[kind][field];
      expect([field, resolvedSteps[kind][field]]).toEqual([field, expected]);
    }
  });

  it('keeps state and mapping on a code-free transformer', () => {
    const flow = getFlowSettings({
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          transformers: {
            st: { state },
            mp: { mapping: { mapping: { page: { view: { ignore: true } } } } },
          },
        },
      },
    });
    expect(flow.transformers?.st.state).toEqual(state);
    expect(flow.transformers?.mp.mapping).toEqual({
      mapping: { page: { view: { ignore: true } } },
    });
  });
});

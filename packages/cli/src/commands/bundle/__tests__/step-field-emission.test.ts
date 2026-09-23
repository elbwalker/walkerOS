import vm from 'vm';
import { STEP_FIELD_ROLES, getStepFieldRole } from '@walkeros/core';
import type { Flow, State } from '@walkeros/core';
import { buildSplitConfigObject, detectNamedImports } from '../bundler';

type Section = 'sources' | 'transformers' | 'destinations' | 'stores';
type Emitted = Record<Section, Record<string, Record<string, unknown>>>;

const SECTION: Record<Flow.StepKind, Section> = {
  Source: 'sources',
  Transformer: 'transformers',
  Destination: 'destinations',
  Store: 'stores',
};

const kinds: Flow.StepKind[] = [
  'Source',
  'Transformer',
  'Destination',
  'Store',
];

/**
 * Evaluate the generated config skeleton against its data payload, the way
 * the bundled `wireConfig(__data)` does, and return the plain-JSON view of
 * the config object the collector receives.
 */
function emit(flow: Flow): Emitted {
  const { storesDeclaration, codeConfigObject, dataPayloadObj } =
    buildSplitConfigObject(flow, detectNamedImports(flow));
  const config: unknown = vm.runInNewContext(
    `(() => {\n${storesDeclaration}\nreturn ${codeConfigObject};\n})()`,
    { __data: dataPayloadObj, stepImpl: () => ({}) },
  );
  return JSON.parse(JSON.stringify(config));
}

function fieldsWithRole(
  kind: Flow.StepKind,
  predicate: (role: string | undefined) => boolean,
): string[] {
  return Object.keys(STEP_FIELD_ROLES[kind]).filter((field) =>
    predicate(getStepFieldRole(kind, field)),
  );
}

/** A distinct marker value for every declared field of `kind`. */
function markers(kind: Flow.StepKind): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fieldsWithRole(kind, (role) => role !== 'reference')) {
    values[field] = { marker: field };
  }
  return values;
}

function flowWith(kind: Flow.StepKind, fields: Record<string, unknown>): Flow {
  const flow: Flow = { config: { platform: 'server' } };
  if (kind === 'Source') {
    flow.sources = { s: Object.assign<Flow.Source, Fields>({}, fields) };
  } else if (kind === 'Destination') {
    flow.destinations = {
      s: Object.assign<Flow.Destination, Fields>({}, fields),
    };
  } else if (kind === 'Transformer') {
    flow.transformers = {
      s: Object.assign<Flow.Transformer, Fields>({}, fields),
    };
  } else {
    flow.stores = { s: Object.assign<Flow.Store, Fields>({}, fields) };
  }
  return flow;
}

type Fields = Record<string, unknown>;

const emissionPaths: Array<[Flow.StepKind, string, Fields]> = kinds.flatMap(
  (kind): Array<[Flow.StepKind, string, Fields]> => {
    const paths: Array<[Flow.StepKind, string, Fields]> = [
      [
        kind,
        'package step',
        { package: '@walkeros/x', import: 'stepImpl', ...markers(kind) },
      ],
      [
        kind,
        'inline code step',
        { code: { push: '$code:(event) => event' }, ...markers(kind) },
      ],
    ];
    if (kind === 'Transformer') {
      paths.push([kind, 'code-free path step', markers(kind)]);
    }
    return paths;
  },
);

describe('step field emission (drift guard over STEP_FIELD_ROLES)', () => {
  it.each(emissionPaths)(
    '%s %s: emits every runtime field',
    (kind, _path, step) => {
      const entry = emit(flowWith(kind, step))[SECTION[kind]].s;
      for (const field of fieldsWithRole(kind, (role) => role === 'runtime')) {
        expect([field, entry[field]]).toEqual([field, { marker: field }]);
      }
    },
  );

  it.each(emissionPaths)(
    '%s %s: emits no build-time field',
    (kind, _path, step) => {
      const entry = emit(flowWith(kind, step))[SECTION[kind]].s;
      for (const field of fieldsWithRole(
        kind,
        (role) => role !== 'runtime' && role !== undefined,
      )) {
        if (field === 'code') continue; // the emitted implementation
        expect([field, entry[field]]).toEqual([field, undefined]);
      }
    },
  );
});

describe('code-free path transformer', () => {
  const state: State[] = [
    { mode: 'get', key: 'event.user.session', value: 'event.data.fetched' },
    { mode: 'set', key: 'event.user.session', value: 'event.data' },
  ];

  it('emits state', () => {
    const entry = emit(flowWith('Transformer', { state })).transformers.s;
    expect(entry.state).toEqual(state);
  });

  it('emits mapping', () => {
    const mapping: Flow.Transformer['mapping'] = {
      mapping: { page: { view: { ignore: true } } },
    };
    const entry = emit(flowWith('Transformer', { mapping })).transformers.s;
    expect(entry.mapping).toEqual(mapping);
  });
});

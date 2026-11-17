import type { DeclaredEnv } from '@walkeros/core';
import {
  knownValuesOf,
  planSecretInjection,
  refusalMessage,
  type InjectionPlan,
} from '../secret-injection.js';

const DECLARED: DeclaredEnv = {
  secrets: ['API_KEY', 'NODE_OPTIONS', 'WALKEROS_FLOW_RELEASE', 'https_proxy'],
  env: ['HOST'],
};

describe('planSecretInjection', () => {
  it.each<
    [
      string,
      Record<string, string>,
      DeclaredEnv | undefined,
      NodeJS.ProcessEnv,
      InjectionPlan,
    ]
  >([
    [
      'sets a declared $secret name that is free',
      { API_KEY: 'value-abc123' },
      DECLARED,
      {},
      { set: { API_KEY: 'value-abc123' }, notDeclared: [], refused: [] },
    ],
    [
      'sets a declared $env name that is free',
      { HOST: 'db.internal' },
      DECLARED,
      {},
      { set: { HOST: 'db.internal' }, notDeclared: [], refused: [] },
    ],
    [
      'refuses a declared name already set in the environment',
      { API_KEY: 'value-abc123' },
      DECLARED,
      { API_KEY: 'value-from-host' },
      {
        set: {},
        notDeclared: [],
        refused: [{ name: 'API_KEY', reason: 'secret-in-env' }],
      },
    ],
    [
      'refuses a declared name set to the same value',
      { API_KEY: 'value-abc123' },
      DECLARED,
      { API_KEY: 'value-abc123' },
      {
        set: {},
        notDeclared: [],
        refused: [{ name: 'API_KEY', reason: 'secret-in-env' }],
      },
    ],
    [
      'refuses a declared name set to the empty string',
      { API_KEY: 'value-abc123' },
      DECLARED,
      { API_KEY: '' },
      {
        set: {},
        notDeclared: [],
        refused: [{ name: 'API_KEY', reason: 'secret-in-env' }],
      },
    ],
    [
      'refuses declared reserved names',
      {
        NODE_OPTIONS: '--require=/tmp/x.js',
        WALKEROS_FLOW_RELEASE: '41',
        https_proxy: 'http://proxy.example',
      },
      DECLARED,
      {},
      {
        set: {},
        notDeclared: [],
        refused: [
          { name: 'NODE_OPTIONS', reason: 'secret-reserved' },
          { name: 'WALKEROS_FLOW_RELEASE', reason: 'secret-reserved' },
          { name: 'https_proxy', reason: 'secret-reserved' },
        ],
      },
    ],
    [
      'never sets a name the flow does not declare',
      { OLD_KEY: 'value-old123' },
      DECLARED,
      {},
      { set: {}, notDeclared: ['OLD_KEY'], refused: [] },
    ],
    [
      'sets every free name of an artifact without the export',
      { API_KEY: 'value-abc123', OLD_KEY: 'value-old123' },
      undefined,
      {},
      {
        set: { API_KEY: 'value-abc123', OLD_KEY: 'value-old123' },
        notDeclared: [],
        refused: [],
      },
    ],
    [
      'refuses a reserved or set name of an artifact without the export',
      { NODE_OPTIONS: '--inspect', API_KEY: 'value-abc123' },
      undefined,
      { API_KEY: 'value-from-host' },
      {
        set: {},
        notDeclared: [],
        refused: [
          { name: 'NODE_OPTIONS', reason: 'secret-reserved' },
          { name: 'API_KEY', reason: 'secret-in-env' },
        ],
      },
    ],
  ])('%s', (_case, fetched, declared, env, plan) => {
    expect(planSecretInjection(fetched, declared, env)).toEqual(plan);
  });
});

describe('knownValuesOf', () => {
  it.each<
    [
      string,
      Record<string, string>,
      DeclaredEnv | undefined,
      NodeJS.ProcessEnv,
      string[],
    ]
  >([
    [
      'every fetched value and each declared name set in the environment',
      { API_KEY: 'value-abc123', OLD_KEY: 'value-old123' },
      DECLARED,
      { HOST: 'db.internal', PATH: '/usr/bin' },
      ['value-abc123', 'value-old123', 'db.internal'],
    ],
    [
      'only the fetched values of an artifact without the export',
      { API_KEY: 'value-abc123' },
      undefined,
      { HOST: 'db.internal' },
      ['value-abc123'],
    ],
  ])('%s', (_case, fetched, declared, env, values) => {
    expect(knownValuesOf(fetched, declared, env)).toEqual(values);
  });
});

describe('refusalMessage', () => {
  it('names each refused name and its reason', () => {
    expect(
      refusalMessage([
        { name: 'API_KEY', reason: 'secret-in-env' },
        { name: 'NODE_OPTIONS', reason: 'secret-reserved' },
      ]),
    ).toBe(
      'Secrets refused: API_KEY (secret-in-env), NODE_OPTIONS (secret-reserved)',
    );
  });
});

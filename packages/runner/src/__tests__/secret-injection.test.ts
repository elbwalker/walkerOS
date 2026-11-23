import type { DeclaredEnv } from '@walkeros/core';
import {
  SecretRefusalError,
  checkReleaseSecrets,
  knownValuesOf,
  planSecretInjection,
  refusalMessage,
  serverSecretValues,
  type InjectionPlan,
} from '../secret-injection.js';

const DECLARED: DeclaredEnv = {
  secrets: ['API_KEY', 'NODE_OPTIONS', 'WALKEROS_CREDENTIAL', 'https_proxy'],
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
        WALKEROS_CREDENTIAL: 'wos_cred_delivered-value',
        https_proxy: 'http://proxy.example',
      },
      DECLARED,
      {},
      {
        set: {},
        notDeclared: [],
        refused: [
          { name: 'NODE_OPTIONS', reason: 'secret-reserved' },
          { name: 'WALKEROS_CREDENTIAL', reason: 'secret-reserved' },
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

describe('checkReleaseSecrets', () => {
  it.each<
    [
      string,
      { app: string[]; server: string[] },
      NodeJS.ProcessEnv,
      InjectionPlan['refused'],
    ]
  >([
    [
      'refuses an app name already set in the environment',
      { app: ['API_KEY'], server: [] },
      { API_KEY: 'value-from-host' },
      [{ name: 'API_KEY', reason: 'secret-in-env' }],
    ],
    [
      'refuses an app name set to the empty string',
      { app: ['API_KEY'], server: [] },
      { API_KEY: '' },
      [{ name: 'API_KEY', reason: 'secret-in-env' }],
    ],
    [
      'refuses reserved app names',
      { app: ['NODE_OPTIONS', 'WALKEROS_X'], server: [] },
      {},
      [
        { name: 'NODE_OPTIONS', reason: 'secret-reserved' },
        { name: 'WALKEROS_X', reason: 'secret-reserved' },
      ],
    ],
    [
      'refuses a reserved server name, set or not',
      { app: [], server: ['WALKEROS_X', 'NODE_EXTRA_CA_CERTS'] },
      { WALKEROS_X: 'value-abc123' },
      [
        { name: 'WALKEROS_X', reason: 'secret-reserved' },
        { name: 'NODE_EXTRA_CA_CERTS', reason: 'secret-reserved' },
      ],
    ],
    [
      'refuses a server name that is not set',
      { app: [], server: ['SALT', 'API_SECRET'] },
      { API_SECRET: 'value-abc123' },
      [{ name: 'SALT', reason: 'secret-missing' }],
    ],
    [
      'counts a server name set to the empty string as set',
      { app: [], server: ['SALT'] },
      { SALT: '' },
      [],
    ],
    [
      'refuses nothing when every app name is free and every server name set',
      { app: ['API_KEY'], server: ['SALT'] },
      { SALT: 'value-salt123' },
      [],
    ],
  ])('%s', (_case, secrets, env, refused) => {
    expect(checkReleaseSecrets(secrets, env)).toEqual(refused);
  });
});

describe('serverSecretValues', () => {
  it('gives the set values of the named server names', () => {
    expect(
      serverSecretValues(['SALT', 'PEPPER', 'EMPTY'], {
        SALT: 'value-salt123',
        EMPTY: '',
        OTHER: 'value-other123',
      }),
    ).toEqual(['value-salt123', '']);
  });
});

describe('a name every object inherits', () => {
  // Read as set, `__proto__` and `constructor` would give a known value that
  // is no string (Object.prototype) and wedge the masking.
  const env: NodeJS.ProcessEnv = {};

  it.each<[string, () => unknown, unknown]>([
    [
      'checkReleaseSecrets refuses a server one as missing',
      () =>
        checkReleaseSecrets(
          { app: [], server: ['__proto__', 'constructor'] },
          env,
        ),
      [
        { name: '__proto__', reason: 'secret-missing' },
        { name: 'constructor', reason: 'secret-missing' },
      ],
    ],
    [
      'checkReleaseSecrets takes an app one as free',
      () => checkReleaseSecrets({ app: ['constructor'], server: [] }, env),
      [],
    ],
    [
      'serverSecretValues gives no value for them',
      () => serverSecretValues(['__proto__', 'constructor'], env),
      [],
    ],
    [
      'knownValuesOf gives no value for a declared one',
      () =>
        knownValuesOf(
          {},
          { secrets: ['__proto__'], env: ['constructor'] },
          env,
        ),
      [],
    ],
    [
      'planSecretInjection sets a delivered one as not set here',
      () =>
        planSecretInjection({ constructor: 'value-ctor123' }, undefined, env),
      { set: { constructor: 'value-ctor123' }, notDeclared: [], refused: [] },
    ],
  ])('%s', (_case, run, expected) => {
    expect(run()).toEqual(expected);
  });
});

describe('SecretRefusalError', () => {
  it('carries the refused names and their message', () => {
    const refused: InjectionPlan['refused'] = [
      { name: 'SALT', reason: 'secret-missing' },
      { name: 'NODE_OPTIONS', reason: 'secret-reserved' },
    ];
    const error = new SecretRefusalError(refused);

    expect(error).toBeInstanceOf(Error);
    expect(error.refused).toEqual(refused);
    expect(error.message).toBe(refusalMessage(refused));
  });
});

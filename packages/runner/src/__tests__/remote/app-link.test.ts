import { redactLine } from '@walkeros/core';
import { createKnownValues } from '@walkeros/core/node';
import { appLinkFromEnvironment } from '../../remote/app-link.js';
import { ReleaseRefusal } from '../../remote/release-document.js';
import { createMockLogger } from '../helpers/mock-logger.js';

const LINK_ENV = {
  WALKEROS_APP_URL: 'http://127.0.0.1:1234/x',
  WALKEROS_DEPLOYMENT_ID: 'dep_shop1',
  WALKEROS_DEPLOY_TOKEN: 'deploy-token-fixed',
  WALKEROS_TOKEN: 'plain-token-fixed',
};

function linkOf(env: NodeJS.ProcessEnv) {
  return appLinkFromEnvironment({
    env,
    logger: createMockLogger(),
    knownValues: createKnownValues(),
  });
}

function encode(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

describe('appLinkFromEnvironment', () => {
  it('answers the origin of the app URL and the deployment', () => {
    const link = linkOf({ ...LINK_ENV });

    expect([link.origin, link.deploymentId]).toEqual([
      'http://127.0.0.1:1234',
      'dep_shop1',
    ]);
  });

  it.each<[string, NodeJS.ProcessEnv, string]>([
    [
      'the deploy token over the plain token',
      { ...LINK_ENV },
      'deploy-token-fixed',
    ],
    [
      'the plain token alone',
      { ...LINK_ENV, WALKEROS_DEPLOY_TOKEN: undefined },
      'plain-token-fixed',
    ],
    [
      'the plain token under an empty deploy token',
      { ...LINK_ENV, WALKEROS_DEPLOY_TOKEN: '' },
      'plain-token-fixed',
    ],
  ])('authorizes with %s', async (_case, env, token) => {
    const link = linkOf(env);

    await expect(
      link.authorize({ method: 'GET', url: `${link.origin}/x` }),
    ).resolves.toEqual({ Authorization: `Bearer ${token}` });
  });

  it.each<[string, NodeJS.ProcessEnv, string]>([
    [
      'a deploy token with a line feed',
      { ...LINK_ENV, WALKEROS_DEPLOY_TOKEN: 'deploy-token\nsecond-half' },
      'WALKEROS_DEPLOY_TOKEN holds a character an HTTP header cannot carry',
    ],
    [
      'a plain token with a carriage return',
      {
        ...LINK_ENV,
        WALKEROS_DEPLOY_TOKEN: undefined,
        WALKEROS_TOKEN: 'plain-token\rsecond-half',
      },
      'WALKEROS_TOKEN holds a character an HTTP header cannot carry',
    ],
    [
      'a deploy token with a space',
      { ...LINK_ENV, WALKEROS_DEPLOY_TOKEN: 'deploy token' },
      'WALKEROS_DEPLOY_TOKEN holds a character an HTTP header cannot carry',
    ],
  ])(
    'refuses %s, naming the variable and never the value',
    (_case, env, message) => {
      expect(() => linkOf(env)).toThrow(message);
      expect(redactLine(message)).toBe(message);
      expect(message).not.toContain('half');
    },
  );

  it('makes the token a known value as it reads it', () => {
    const knownValues = createKnownValues();

    appLinkFromEnvironment({
      env: { ...LINK_ENV },
      logger: createMockLogger(),
      knownValues,
    });

    expect(knownValues.values()).toEqual(['deploy-token-fixed']);
  });

  it('removes all four names from the environment it read', () => {
    const env: NodeJS.ProcessEnv = { ...LINK_ENV, PATH: '/usr/bin' };

    linkOf(env);

    expect(env).toEqual({ PATH: '/usr/bin' });
  });

  it.each<[string, NodeJS.ProcessEnv, string]>([
    [
      'a missing app URL',
      { ...LINK_ENV, WALKEROS_APP_URL: undefined },
      'WALKEROS_APP_URL is not set',
    ],
    [
      'an app URL that does not parse',
      { ...LINK_ENV, WALKEROS_APP_URL: 'app.example' },
      'WALKEROS_APP_URL is not an http or https URL',
    ],
    [
      'an app URL of another scheme',
      { ...LINK_ENV, WALKEROS_APP_URL: 'ftp://app.example' },
      'WALKEROS_APP_URL is not an http or https URL',
    ],
    [
      'a missing deployment',
      { ...LINK_ENV, WALKEROS_DEPLOYMENT_ID: '' },
      'WALKEROS_DEPLOYMENT_ID is not set',
    ],
    [
      'a malformed deployment',
      { ...LINK_ENV, WALKEROS_DEPLOYMENT_ID: 'abc' },
      'WALKEROS_DEPLOYMENT_ID is not a deployment id (dep_ and 1 to 64 lowercase letters or digits)',
    ],
    [
      'no token',
      { ...LINK_ENV, WALKEROS_DEPLOY_TOKEN: undefined, WALKEROS_TOKEN: '' },
      'WALKEROS_DEPLOY_TOKEN and WALKEROS_TOKEN are not set',
    ],
  ])(
    'throws naming the variable for %s, and removes the names',
    (_case, env, message) => {
      expect(() => linkOf(env)).toThrow(message);
      expect(redactLine(message)).toBe(message);
      expect(
        Object.keys(env).filter((name) => env[name] !== undefined),
      ).toEqual([]);
    },
  );

  it('closes without throwing', () => {
    expect(() => linkOf({ ...LINK_ENV }).close()).not.toThrow();
  });
});

describe('readSecretSet', () => {
  it('keeps a value named __proto__ as a value of its own', () => {
    const values = linkOf({ ...LINK_ENV }).readSecretSet(
      new TextEncoder().encode(
        '{"deployment":"dep_shop1","sequence":17,"values":{"__proto__":"value-proto-v17"}}',
      ),
      { deployment: 'dep_shop1', sequence: 17 },
    );

    expect(Object.entries(values)).toEqual([['__proto__', 'value-proto-v17']]);
  });

  const expectSet = { deployment: 'dep_shop1', sequence: 17 };

  it('answers the values of a set for this deployment and sequence', () => {
    const link = linkOf({ ...LINK_ENV });

    expect(
      link.readSecretSet(
        encode({ ...expectSet, values: { API_KEY: 'value-abc123' } }),
        expectSet,
      ),
    ).toEqual({ API_KEY: 'value-abc123' });
  });

  it.each<[string, Uint8Array]>([
    [
      'another deployment',
      encode({ deployment: 'dep_other', sequence: 17, values: {} }),
    ],
    ['another sequence', encode({ ...expectSet, sequence: 16, values: {} })],
    [
      'a value that is not a string',
      encode({ ...expectSet, values: { API_KEY: 42 } }),
    ],
    ['values that are not an object', encode({ ...expectSet, values: ['x'] })],
    ['no values', encode(expectSet)],
    ['an array', encode([expectSet])],
    ['a body that is not JSON', new TextEncoder().encode('{"deployment"')],
  ])('refuses %s as secret-set', (_case, bytes) => {
    const link = linkOf({ ...LINK_ENV });
    let refusal: unknown;
    try {
      link.readSecretSet(bytes, expectSet);
    } catch (error) {
      refusal = error;
    }

    expect(refusal).toBeInstanceOf(ReleaseRefusal);
    expect(refusal).toMatchObject({ check: 'secret-set', sequence: 17 });
  });
});

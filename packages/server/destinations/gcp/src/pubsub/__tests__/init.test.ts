jest.mock('@google-cloud/pubsub');

import { PubSub } from '@google-cloud/pubsub';
import { __getMockCalls, __resetMockCalls } from '@google-cloud/pubsub';
import type { Destination, Env, InitSettings, Settings } from '../types';
import { createMockContext, createMockLogger } from '@walkeros/core';
import type { MockLogger } from '@walkeros/core';

interface ResolvedConfigShape {
  settings: Settings;
}

function isResolvedConfig(value: unknown): value is ResolvedConfigShape {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { settings?: unknown } = value;
  return typeof candidate.settings === 'object' && candidate.settings !== null;
}

async function callInit(
  destination: Destination,
  initSettings: InitSettings,
  envOverride?: Env,
  logger?: MockLogger,
): Promise<unknown> {
  if (!destination.init) throw new Error('destination.init undefined');
  const ctx = createMockContext({
    config: { settings: initSettings },
    env: envOverride ?? {},
    logger: logger ?? createMockLogger(),
    id: 'test-pubsub',
  });
  return destination.init(ctx);
}

describe('Server Destination Pub/Sub init', () => {
  let destination: Destination;

  beforeEach(() => {
    __resetMockCalls();
    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  test('init throws when projectId is missing', async () => {
    const logger = createMockLogger();
    await expect(
      callInit(
        destination,
        { projectId: '', topic: 'events' },
        undefined,
        logger,
      ),
    ).rejects.toThrow('Config settings projectId missing');
  });

  test('init throws when topic is missing', async () => {
    const logger = createMockLogger();
    await expect(
      callInit(destination, { projectId: 'p', topic: '' }, undefined, logger),
    ).rejects.toThrow('Config settings topic missing');
  });

  test('init constructs the (mocked) PubSub client', async () => {
    const result = await callInit(destination, {
      projectId: 'p',
      topic: 'events',
    });
    expect(result).toBeTruthy();
    if (!result) return;
    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('PubSub.ctor');
  });

  test('init populates settings.client', async () => {
    const result = await callInit(destination, {
      projectId: 'p',
      topic: 'events',
    });
    expect(isResolvedConfig(result)).toBe(true);
    if (!isResolvedConfig(result)) return;
    expect(result.settings.client).toBeDefined();
  });

  test('init reuses a user-supplied client without invoking the constructor', async () => {
    const userClient = new PubSub();
    __resetMockCalls();

    const result = await callInit(destination, {
      projectId: 'p',
      topic: 'events',
      client: userClient,
    });
    expect(isResolvedConfig(result)).toBe(true);
    if (!isResolvedConfig(result)) return;
    expect(result.settings.client).toBe(userClient);
    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).not.toContain('PubSub.ctor');
  });

  test('init parses string credentials JSON', async () => {
    const credsObj = {
      client_email: 'sa@example.com',
      private_key: '-----BEGIN PRIVATE KEY-----',
    };
    const result = await callInit(destination, {
      projectId: 'p',
      topic: 'events',
      credentials: JSON.stringify(credsObj),
    });
    expect(isResolvedConfig(result)).toBe(true);
    if (!isResolvedConfig(result)) return;
    expect(result.settings.credentials).toEqual(credsObj);
  });

  test('init throws on invalid credentials JSON', async () => {
    const logger = createMockLogger();
    await expect(
      callInit(
        destination,
        {
          projectId: 'p',
          topic: 'events',
          credentials: 'not-json',
        },
        undefined,
        logger,
      ),
    ).rejects.toThrow('Invalid credentials JSON');
  });

  test('destroy calls client.close()', async () => {
    const result = await callInit(destination, {
      projectId: 'p',
      topic: 'events',
    });
    expect(isResolvedConfig(result)).toBe(true);
    if (!isResolvedConfig(result)) return;

    if (!destination.destroy) throw new Error('destroy missing');
    await destination.destroy({
      id: 'test-pubsub',
      config: result,
      env: {},
      logger: createMockLogger(),
    });

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('PubSub.close');
  });

  test('destroy is a no-op when settings is missing', async () => {
    if (!destination.destroy) throw new Error('destroy missing');
    await expect(
      destination.destroy({
        id: 'test-pubsub',
        config: {},
        env: {},
        logger: createMockLogger(),
      }),
    ).resolves.toBeUndefined();
  });
});

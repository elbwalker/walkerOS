import { FirehoseClient } from '@aws-sdk/client-firehose';
import {
  createEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import destination, { destinationFirehose } from '../';
import { AwsDeliveryError } from '../../lib/errors';
import type { PartialConfig, SendClient } from '../types';
import { STREAM, id, initialized, isRecord, recordingEnv } from './support';

const KEYS = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'SECRETEXAMPLE' };

function deepFreeze<T>(value: T): T {
  if (isRecord(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const savedEnv = { ...process.env };

beforeEach(() => {
  // A developer profile or region must not leak into the region order.
  delete process.env.AWS_REGION;
  delete process.env.AWS_PROFILE;
  process.env.AWS_CONFIG_FILE = '/nonexistent/aws-config';
  process.env.AWS_SHARED_CREDENTIALS_FILE = '/nonexistent/aws-credentials';
  jest.restoreAllMocks();
});

afterAll(() => {
  process.env = savedEnv;
});

describe('client construction', () => {
  test('without env init builds a real FirehoseClient and makes no call', async () => {
    const send = jest.spyOn(FirehoseClient.prototype, 'send');
    const provider = jest.fn(async () => KEYS);

    const config = await initialized(
      { settings: { streamName: STREAM, config: { credentials: provider } } },
      undefined,
    );

    expect(config.settings.client).toBeInstanceOf(FirehoseClient);
    expect(send).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  test('a mock env wins and gets the per-attempt timeout', async () => {
    const recording = recordingEnv();
    const config = await initialized(
      { settings: { streamName: STREAM }, timeout: 4000 },
      recording.env,
    );

    expect(recording.constructed).toEqual([
      {
        region: 'eu-central-1',
        requestHandler: { requestTimeout: 1000, throwOnRequestTimeout: true },
      },
    ]);
    expect(config.settings.client).not.toBeInstanceOf(FirehoseClient);
    expect(recording.sends).toEqual([]);
  });

  test('a user client is used as is and never closed', async () => {
    const recording = recordingEnv();
    const destroy = jest.fn();
    const client: SendClient = { send: jest.fn(), destroy };

    const config = await initialized(
      { settings: { streamName: STREAM, client } },
      recording.env,
    );
    await destination.destroy?.({
      id,
      config,
      env: recording.env,
      logger: createMockLogger(),
    });

    expect(config.settings.client).toBe(client);
    expect(recording.constructed).toEqual([]);
    expect(destroy).not.toHaveBeenCalled();
  });

  test('a user request handler instance is never closed with the client', async () => {
    const recording = recordingEnv();
    const handler = { handle: jest.fn(), destroy: jest.fn() };
    const config = await initialized(
      { settings: { streamName: STREAM, config: { requestHandler: handler } } },
      recording.env,
    );
    await destination.destroy?.({
      id,
      config,
      env: recording.env,
      logger: createMockLogger(),
    });
    expect(recording.constructed[0].requestHandler).toBe(handler);
    expect(recording.destroyed[0]).not.toHaveBeenCalled();
  });

  test('a user requestHandler is left untouched', async () => {
    const recording = recordingEnv();
    const requestHandler = { requestTimeout: 9000 };
    await initialized(
      { settings: { streamName: STREAM, config: { requestHandler } } },
      recording.env,
    );
    expect(recording.constructed[0].requestHandler).toBe(requestHandler);
  });
});

describe('settings', () => {
  test('the deprecated alias still works', async () => {
    const recording = recordingEnv();
    const config = await initialized(
      { settings: { firehose: { streamName: STREAM, region: 'us-east-1' } } },
      recording.env,
    );
    expect(config.settings).toMatchObject({
      streamName: STREAM,
      region: 'us-east-1',
      newline: true,
    });
    expect(config.settings).not.toHaveProperty('firehose');
  });

  test('a flat key and its alias with different values throw', async () => {
    await expect(
      initialized(
        {
          settings: {
            streamName: STREAM,
            firehose: { streamName: 'other-stream' },
          },
        },
        recordingEnv().env,
      ),
    ).rejects.toThrow('settings.firehose.streamName');
  });

  test('a flat key and its alias with equal values are no conflict', async () => {
    const recording = recordingEnv();
    const config = await initialized(
      {
        settings: {
          streamName: STREAM,
          config: { maxAttempts: 3, endpoint: 'http://localhost:4566' },
          firehose: {
            streamName: STREAM,
            config: { maxAttempts: 3, endpoint: 'http://localhost:4566' },
          },
        },
      },
      recording.env,
    );
    expect(config.settings.streamName).toBe(STREAM);
    expect(recording.constructed[0]).toMatchObject({ maxAttempts: 3 });
  });

  test.each([
    ['missing', {}],
    ['invalid', { streamName: 'bad name!' }],
  ])('a %s streamName throws with the fix', async (_case, settings) => {
    const error = await initialized({ settings }, recordingEnv().env).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AwsDeliveryError);
    expect(error).toMatchObject({ code: 'InvalidConfig', retryable: false });
    expect(String(error)).toContain('settings.streamName');
  });

  test('the caller config is never mutated', async () => {
    const input: PartialConfig = {
      settings: { streamName: STREAM, config: { maxAttempts: 3 } },
      credentials: KEYS,
      mapping: { page: { view: { data: 'data' } } },
    };
    const snapshot = structuredClone(input);
    await initialized(deepFreeze(input), recordingEnv().env);
    expect(input).toEqual(snapshot);
  });

  test('the returned config keeps every field besides settings', async () => {
    const config = await initialized(
      {
        settings: { streamName: STREAM },
        before: 'fingerprint',
        next: 'audit',
        consent: { marketing: true },
        mapping: { page: { view: { name: 'pv' } } },
        data: { map: { id: 'id' } },
      },
      recordingEnv().env,
    );
    expect(config).toMatchObject({
      before: 'fingerprint',
      next: 'audit',
      consent: { marketing: true },
      mapping: { page: { view: { name: 'pv' } } },
      data: { map: { id: 'id' } },
    });
  });

  test('newline defaults to true and can be turned off', async () => {
    const off = await initialized(
      { settings: { streamName: STREAM, newline: false } },
      recordingEnv().env,
    );
    expect(off.settings.newline).toBe(false);
  });

  test('batching is on by default', () => {
    expect(destinationFirehose.config.batch).toEqual({ size: 500, age: 1000 });
  });
});

describe('region order', () => {
  async function regionOf(settings: PartialConfig['settings']) {
    const recording = recordingEnv();
    const config = await initialized({ settings }, recording.env);
    expect(recording.constructed[0].region).toBe(config.settings.region);
    return config.settings.region;
  }

  test('settings.region comes first', async () => {
    process.env.AWS_REGION = 'ap-south-1';
    expect(await regionOf({ streamName: STREAM, region: 'us-west-2' })).toBe(
      'us-west-2',
    );
  });

  test('a string region in settings.config comes next', async () => {
    process.env.AWS_REGION = 'ap-south-1';
    expect(
      await regionOf({ streamName: STREAM, config: { region: 'sa-east-1' } }),
    ).toBe('sa-east-1');
  });

  test('then AWS_REGION', async () => {
    process.env.AWS_REGION = 'ap-south-1';
    expect(await regionOf({ streamName: STREAM })).toBe('ap-south-1');
  });

  test('then eu-central-1', async () => {
    expect(await regionOf({ streamName: STREAM })).toBe('eu-central-1');
  });
});

describe('credentials', () => {
  test('config.credentials wins over settings.config.credentials', async () => {
    const recording = recordingEnv();
    const fromSettings = { accessKeyId: 'other', secretAccessKey: 'other' };
    await initialized(
      {
        settings: { streamName: STREAM, config: { credentials: fromSettings } },
        credentials: JSON.stringify(KEYS),
      },
      recording.env,
    );
    expect(recording.constructed[0].credentials).toEqual(KEYS);
  });

  test('settings.config.credentials is used when config.credentials is unset', async () => {
    const recording = recordingEnv();
    const fromSettings = { accessKeyId: 'other', secretAccessKey: 'other' };
    await initialized(
      {
        settings: { streamName: STREAM, config: { credentials: fromSettings } },
      },
      recording.env,
    );
    expect(recording.constructed[0].credentials).toBe(fromSettings);
  });

  test('neither leaves the SDK default chain', async () => {
    const recording = recordingEnv();
    await initialized({ settings: { streamName: STREAM } }, recording.env);
    expect(recording.constructed[0]).not.toHaveProperty('credentials');
  });

  test('malformed credentials throw without echoing a value', async () => {
    const error = await initialized(
      {
        settings: { streamName: STREAM },
        credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: '' },
      },
      recordingEnv().env,
    ).catch((e: unknown) => e);
    expect(String(error)).toContain('config.credentials.secretAccessKey');
    expect(String(error)).not.toContain('AKIDEXAMPLE');
  });

  test('the debug line names the source, never a value', async () => {
    const logger = createMockLogger();
    await initialized(
      { settings: { streamName: STREAM }, credentials: KEYS },
      recordingEnv().env,
      logger,
    );
    expect(logger.debug).toHaveBeenCalledWith('Firehose client ready', {
      stream: STREAM,
      region: 'eu-central-1',
      credentials: 'config.credentials',
    });
    expect(JSON.stringify(logger.debug.mock.calls)).not.toContain(
      'SECRETEXAMPLE',
    );
  });
});

describe('destroy', () => {
  test('waits for a pending send, then closes the owned client', async () => {
    let release: () => void = () => undefined;
    const order: string[] = [];
    const recording = recordingEnv(
      (input) =>
        new Promise((resolve) => {
          release = () => {
            order.push('send settled');
            resolve({
              FailedPutCount: 0,
              RequestResponses: (input.Records ?? []).map(() => ({})),
            });
          };
        }),
    );
    const config = await initialized(
      { settings: { streamName: STREAM } },
      recording.env,
    );
    recording.destroyed[0].mockImplementation(() => order.push('closed'));

    const pushing = destination.push(
      createEvent(),
      createMockContext({ config, env: recording.env, id }),
    );
    await Promise.resolve();
    const destroying = destination.destroy?.({
      id,
      config,
      env: recording.env,
      logger: createMockLogger(),
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(order).toEqual([]);

    release();
    await Promise.all([pushing, destroying]);
    expect(order).toEqual(['send settled', 'closed']);
    expect(recording.destroyed[0]).toHaveBeenCalledTimes(1);
  });
});

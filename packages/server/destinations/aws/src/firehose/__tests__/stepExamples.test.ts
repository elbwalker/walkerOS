import type { FirehoseClientConfig } from '@aws-sdk/client-firehose';
import type { Mapping, WalkerOS } from '@walkeros/core';
import { createMockContext, getMappingValue, isObject } from '@walkeros/core';
import destination from '../';
import * as examples from '../examples';
import type {
  Env,
  FirehoseClientConstructor,
  PartialConfig,
  SendClient,
} from '../types';
import type { CredentialsInput } from '../../lib/credentials';
import { id } from './support';

type CallRecord = [string, ...unknown[]];

function isEvent(value: unknown): value is WalkerOS.Event {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    typeof value.entity === 'string'
  );
}

function isRule(value: unknown): value is Mapping.Rule {
  return isObject(value);
}

function isCredentials(value: unknown): value is CredentialsInput {
  return (
    isObject(value) &&
    typeof value.accessKeyId === 'string' &&
    typeof value.secretAccessKey === 'string'
  );
}

function toConfig(raw: unknown): PartialConfig {
  if (!isObject(raw) || !isObject(raw.settings))
    throw new Error('init example `in` must be a config');
  const { streamName, region } = raw.settings;
  if (typeof streamName !== 'string' || typeof region !== 'string')
    throw new Error('init example settings need streamName and region');
  if (!isCredentials(raw.credentials))
    throw new Error('init example needs credentials');
  return { settings: { streamName, region }, credentials: raw.credentials };
}

/** The mock env, with construction and every send recorded. */
function recordingEnv(calls: CallRecord[]): Env {
  const mock = examples.env.push.AWS;
  if (!mock?.FirehoseClient) throw new Error('mock env lacks FirehoseClient');
  const Base: FirehoseClientConstructor = mock.FirehoseClient;

  class RecordingClient implements SendClient {
    private readonly inner: SendClient;
    constructor(config: FirehoseClientConfig) {
      calls.push(['new FirehoseClient', config]);
      this.inner = new Base(config);
    }
    async send(command: object) {
      calls.push([
        'client.send',
        'input' in command ? command.input : undefined,
      ]);
      return this.inner.send(command);
    }
  }

  return { AWS: { ...mock, FirehoseClient: RecordingClient } };
}

describe('Step Examples', () => {
  const initCalls = examples.step.init.out ?? [];

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const calls: CallRecord[] = [];
    const env = recordingEnv(calls);

    const config = await destination.init(
      createMockContext({ config: toConfig(examples.step.init.in), env, id }),
    );
    if (!config) throw new Error('init must return the config');

    if (!isEvent(example.in)) {
      expect(calls).toEqual(example.out);
      return;
    }

    const rule = isRule(example.mapping) ? example.mapping : undefined;
    const data =
      rule && rule.data !== undefined
        ? await getMappingValue(example.in, rule.data, {
            collector: createMockContext().collector,
          })
        : undefined;

    await destination.push(
      example.in,
      createMockContext({ config, env, id, rule, data }),
    );

    expect(calls.slice(initCalls.length)).toEqual(example.out);
  });
});

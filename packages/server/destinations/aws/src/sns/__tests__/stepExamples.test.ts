import type { SNSClientConfig } from '@aws-sdk/client-sns';
import type { Mapping, WalkerOS } from '@walkeros/core';
import { createMockContext, getMappingValue, isObject } from '@walkeros/core';
import destination from '../';
import * as examples from '../examples';
import type { Env, PartialConfig, SendClient } from '../types';
import type { CredentialsInput } from '../../lib/credentials';

type CallRecord = [string, ...unknown[]];

const id = 'sns';

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

/** The init example's config, or that config aimed at another topic. */
function toConfig(raw: unknown, topicArn?: string): PartialConfig {
  if (!isObject(raw) || !isObject(raw.settings))
    throw new Error('init example `in` must be a config');
  const arn = topicArn ?? raw.settings.topicArn;
  if (typeof arn !== 'string') throw new Error('init example needs topicArn');
  if (!isCredentials(raw.credentials))
    throw new Error('init example needs credentials');
  return { settings: { topicArn: arn }, credentials: raw.credentials };
}

/** The topic a push example publishes to, read from its expected call. */
function topicOf(out: unknown): string | undefined {
  if (!Array.isArray(out) || !Array.isArray(out[0])) return undefined;
  const input: unknown = out[0][1];
  return isObject(input) && typeof input.TopicArn === 'string'
    ? input.TopicArn
    : undefined;
}

/** The mock env, with construction and every send recorded. */
function recordingEnv(calls: CallRecord[]): Env {
  const mock = examples.env.push.AWS;
  if (!mock?.SNSClient) throw new Error('mock env lacks SNSClient');
  const Base = mock.SNSClient;

  class RecordingClient implements SendClient {
    private readonly inner: SendClient;
    constructor(config: SNSClientConfig) {
      calls.push(['new SNSClient', config]);
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

  return { AWS: { ...mock, SNSClient: RecordingClient } };
}

describe('SNS step examples', () => {
  const initCalls = examples.step.init.out ?? [];

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const calls: CallRecord[] = [];
    const env = recordingEnv(calls);
    const push = isEvent(example.in);

    const config = await destination.init(
      createMockContext({
        config: toConfig(
          examples.step.init.in,
          push ? topicOf(example.out) : undefined,
        ),
        env,
        id,
      }),
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

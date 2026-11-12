import { createIngest, createMockContext, recordEnv } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import type { Source } from '@walkeros/core';
import { sourceSqs } from '../index';
import * as env from '../examples/env';
import type { Types } from '../types';

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(env));

it('records the send calls of the example client', async () => {
  const recorded = recordEnv(env.push, env.simulation);
  const context: Source.Context<Types> = {
    ...createMockContext<Types>({
      config: { settings: { queueName: 'walkeros-events' } },
      env: recorded.env,
    }),
    id: 'sqs',
    withScope: async (_raw, respond, body) =>
      body({ ...recorded.env, ingest: createIngest('sqs'), respond }),
  };
  const instance = await sourceSqs(context);
  await instance.on?.('run');
  await instance.destroy?.({
    id: 'sqs',
    config: instance.config,
    env: recorded.env,
    logger: context.logger,
  });

  const inputs = recorded.calls.map(({ fn, args }) => {
    const [command] = args;
    const input =
      typeof command === 'object' && command !== null && 'input' in command
        ? command.input
        : undefined;
    return [fn, input];
  });
  expect(inputs).toEqual(
    expect.arrayContaining([
      ['AWS.SQSClient.send', { QueueName: 'walkeros-events' }],
      [
        'AWS.SQSClient.send',
        expect.objectContaining({ MaxNumberOfMessages: 10 }),
      ],
    ]),
  );
});

import { createIngest, createMockContext, observeEnv } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import type { Source } from '@walkeros/core';
import { sourcePubSubPull } from '../index';
import * as env from '../examples/env';
import type { Types } from '../types';

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(env));

it('records the subscription call of the example client', async () => {
  const observed = observeEnv(env.push, env.simulation);
  const context: Source.Context<Types> = {
    ...createMockContext<Types>({
      config: {
        settings: { projectId: 'test-project', subscription: 'events-sub' },
      },
      env: observed.env,
    }),
    id: 'pubsub',
    withScope: async (_raw, respond, body) =>
      body({ ...observed.env, ingest: createIngest('pubsub'), respond }),
  };
  const instance = await sourcePubSubPull(context);
  await instance.on?.('run');
  await instance.destroy?.({
    id: 'pubsub',
    config: instance.config,
    env: observed.env,
    logger: context.logger,
  });

  expect(observed.calls.map(({ fn, args }) => [fn, args[0]])).toEqual([
    ['PubSub.subscription', 'events-sub'],
  ]);
});

jest.mock('@aws-sdk/client-sqs');
jest.mock('@aws-sdk/client-sns');

import { __resetMockCalls, __setQueueHarness } from '@aws-sdk/client-sqs';
import { __resetSnsMockCalls } from '@aws-sdk/client-sns';
import sourceSqs from '..';
import { setup as setupFn } from '../setup';
import { createMockContext } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Types } from '../types';
import { push as pushEnv } from '../examples/env';

describe('CLI setup wiring (sqs)', () => {
  beforeEach(() => {
    __resetMockCalls();
    __resetSnsMockCalls();
  });

  it('default export is the source init function', () => {
    expect(typeof sourceSqs).toBe('function');
  });

  it('source init returns an instance whose setup === the exported setup', async () => {
    __setQueueHarness('walkeros-events', {});
    const base = createMockContext<Types>({
      config: {
        settings: { queueName: 'walkeros-events', region: 'eu-central-1' },
      },
      env: pushEnv,
    });
    const ctx: Source.Context<Types> = {
      ...base,
      id: 'sqs',
      setIngest: async () => undefined,
      setRespond: () => undefined,
    };
    const instance = await sourceSqs(ctx);
    expect(instance.setup).toBe(setupFn);
    if (instance.destroy) {
      await instance.destroy({
        id: 'sqs',
        config: instance.config,
        env: pushEnv,
        logger: ctx.logger,
      });
    }
  });
});

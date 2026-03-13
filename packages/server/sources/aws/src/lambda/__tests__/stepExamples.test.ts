import type { Source, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceLambda } from '../index';
import type { Types } from '../types';
import { examples } from '../../dev';

function createSourceContext(
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  return {
    config: { settings: { enablePixelTracking: true } },
    env: env as Types['env'],
    logger: env.logger || createMockLogger(),
    id: 'test-lambda',
    collector: {} as Collector.Instance,
    setIngest: jest.fn().mockResolvedValue(undefined),
    setRespond: jest.fn(),
  };
}

describe('Step Examples', () => {
  let mockPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush = jest
      .fn()
      .mockResolvedValue({ event: { id: 'test-id' }, ok: true });
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const source = await sourceLambda(
      createSourceContext({
        push: mockPush as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger: createMockLogger(),
      }),
    );

    const trigger = examples.createTrigger(source);
    await trigger(example.in);

    const expected = example.out as { name: string; data?: unknown };
    const input = example.in as Record<string, unknown>;

    expect(mockPush).toHaveBeenCalled();
    const pushedData = mockPush.mock.calls[0][0];
    const rc = (input.requestContext as Record<string, unknown>) || {};
    const http = (rc.http as Record<string, unknown>) || {};
    const isGet = http.method === 'GET';
    if (isGet) {
      expect(pushedData.e || pushedData.name).toBe(expected.name);
    } else {
      expect(pushedData.name).toBe(expected.name);
      if (expected.data) expect(pushedData.data).toEqual(expected.data);
    }
  });
});

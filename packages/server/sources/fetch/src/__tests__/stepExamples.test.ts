import type { Source, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceFetch } from '../index';
import type { Types } from '../types';
import { examples } from '../dev';
import type { Content } from '../examples/trigger';

function createSourceContext(
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  return {
    config: {},
    env: env as Types['env'],
    logger: env.logger || createMockLogger(),
    id: 'test-fetch',
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
    const source = await sourceFetch(
      createSourceContext({
        push: mockPush as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger: createMockLogger(),
      }),
    );

    const trigger = examples.createTrigger(source);
    await trigger(example.in as Content);

    expect(mockPush).toHaveBeenCalled();
    const pushedData = mockPush.mock.calls[0][0];
    const expected = example.out as { name: string; data?: unknown };
    const input = example.in as Content;

    if (input.method === 'POST') {
      expect(pushedData.name).toBe(expected.name);
      if (expected.data) expect(pushedData.data).toEqual(expected.data);
    } else {
      expect(pushedData.e || pushedData.name).toBe(expected.name);
    }
  });
});

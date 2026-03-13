import type { Source, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCloudFunction } from '../index';
import type { Types } from '../types';
import { examples } from '../../dev';
import type { Content } from '../examples/trigger';

function createSourceContext(
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  return {
    config: {},
    env: env as Types['env'],
    logger: env.logger || createMockLogger(),
    id: 'test-cloudfunction',
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
    const source = await sourceCloudFunction(
      createSourceContext({
        push: mockPush as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger: createMockLogger(),
      }),
    );

    const trigger = examples.createTrigger(source);
    const result = await trigger(example.in as Content);

    const expected = example.out as { name: string; data?: unknown };

    expect(result.status).toBe(200);
    expect(mockPush).toHaveBeenCalled();
    const pushedData = mockPush.mock.calls[0][0];
    expect(pushedData.name).toBe(expected.name);
    if (expected.data) expect(pushedData.data).toEqual(expected.data);
  });
});

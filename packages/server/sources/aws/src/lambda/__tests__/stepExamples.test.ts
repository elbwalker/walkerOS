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

    const lambdaEvent = example.in as Record<string, unknown>;
    const expected = example.out as { name: string; data?: unknown };

    // Lambda source expects EventRequest format (event: string, not name: string)
    // Adapt body to match the actual source interface
    if (lambdaEvent.body && typeof lambdaEvent.body === 'string') {
      const body = JSON.parse(lambdaEvent.body);
      if (body.name && !body.event) {
        lambdaEvent.body = JSON.stringify({
          ...body,
          event: body.name,
          name: undefined,
        });
      }
    }

    await source.push(lambdaEvent, { awsRequestId: 'test-req' });

    expect(mockPush).toHaveBeenCalled();
    const pushedData = mockPush.mock.calls[0][0];
    const rc = (lambdaEvent.requestContext as Record<string, unknown>) || {};
    const http = (rc.http as Record<string, unknown>) || {};
    const isGet = http.method === 'GET';
    if (isGet) {
      // GET pushes requestToData output ({e, d} format)
      expect(pushedData.e || pushedData.name).toBe(expected.name);
    } else {
      expect(pushedData.name).toBe(expected.name);
      if (expected.data) expect(pushedData.data).toEqual(expected.data);
    }
  });
});

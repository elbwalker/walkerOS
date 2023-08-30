import type { NodeClient, NodeDestination } from '../types';
import type { Elbwalker } from '@elbwalker/types';
import { createNodeClient } from '../';

describe('Node Destination', () => {
  const mockDestinationPush = jest.fn(); //.mockImplementation(console.log);
  const version = { client: expect.any(String), tagging: expect.any(Number) };
  const mockEvent: Elbwalker.Event = {
    event: 'entity action',
    data: expect.any(Object),
    context: {},
    custom: {},
    globals: {},
    user: {},
    nested: [],
    consent: {},
    id: expect.any(String),
    trigger: '',
    entity: 'entity',
    action: 'action',
    timestamp: expect.any(Number),
    timing: expect.any(Number),
    group: expect.any(String),
    count: expect.any(Number),
    version,
    source: {
      type: 'node',
      id: '@TODO',
      previous_id: '@TODO',
    },
  };
  const mockDestination: NodeDestination.Function = {
    config: {},
    push: mockDestinationPush,
  };

  function getClient(custom?: Partial<NodeClient.Config>) {
    const config = custom || {
      destinations: { mock: mockDestination },
    };

    return createNodeClient(config);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('destination fail', async () => {
    const destinationFailure: NodeDestination.Function = {
      config: {},
      push: jest.fn().mockImplementation(() => {
        throw new Error('kaputt');
      }),
    };

    const { elb } = getClient({
      destinations: { mockDestination, destinationFailure },
    });
    const result = await elb('e a');

    expect(result).toEqual({
      status: { ok: false },
      successful: [
        {
          id: 'mockDestination',
          destination: mockDestination,
        },
      ],
      failed: [
        {
          id: 'destinationFailure',
          destination: destinationFailure,
          error: expect.any(Error),
        },
      ],
    });
    expect(result.failed[0].error).toHaveProperty('message', 'kaputt');
  });
});

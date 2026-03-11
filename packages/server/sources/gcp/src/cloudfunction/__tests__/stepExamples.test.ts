import type { Source, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCloudFunction } from '../index';
import type { Types, Request, Response } from '../types';
import { examples } from '../../dev';

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

function createMockResponse(): Response {
  const mockResponse: Record<string, unknown> = {
    status: jest.fn(() => mockResponse),
    json: jest.fn(() => mockResponse),
    send: jest.fn(() => mockResponse),
    set: jest.fn(() => mockResponse),
    end: jest.fn(),
  };
  return mockResponse as unknown as Response;
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
    const input = example.in as {
      method: string;
      body: Record<string, unknown>;
      headers?: Record<string, string>;
    };
    const expected = example.out as { name: string; data?: unknown };

    const source = await sourceCloudFunction(
      createSourceContext({
        push: mockPush as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger: createMockLogger(),
      }),
    );

    // CloudFunction source expects EventRequest format (event: string, not name: string)
    // Adapt body to match the actual source interface
    const body = { ...input.body };
    if (body.name && !body.event) {
      body.event = body.name;
      delete body.name;
    }

    const req = {
      method: input.method,
      body,
      headers: input.headers || { 'content-type': 'application/json' },
      get: (h: string) =>
        (input.headers || { 'content-type': 'application/json' })[
          h.toLowerCase()
        ],
    } as Request;

    const res = createMockResponse();
    await source.push(req, res);

    expect(mockPush).toHaveBeenCalled();
    const pushedData = mockPush.mock.calls[0][0];
    expect(pushedData.name).toBe(expected.name);
    if (expected.data) expect(pushedData.data).toEqual(expected.data);
  });
});

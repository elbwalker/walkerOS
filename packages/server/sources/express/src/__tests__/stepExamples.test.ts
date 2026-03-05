import type { Source, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceExpress } from '../index';
import type { Types } from '../types';
import type { Request, Response } from 'express';
import { examples } from '../dev';

function createSourceContext(
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  return {
    config: {},
    env: env as Types['env'],
    logger: env.logger || createMockLogger(),
    id: 'test-express',
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
      path: string;
      body?: unknown;
      query?: Record<string, string>;
    };

    const source = await sourceExpress(
      createSourceContext({
        push: mockPush as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger: createMockLogger(),
      }),
    );

    let url = input.path;
    if (input.query) {
      const params = new URLSearchParams(input.query).toString();
      url = `${input.path}?${params}`;
    }

    const req = {
      method: input.method,
      url,
      body: input.body,
      headers: { 'content-type': 'application/json' },
      get: (h: string) =>
        ({ 'content-type': 'application/json' })[h.toLowerCase()],
    } as Request;

    const res = createMockResponse();
    await source.push(req, res);

    expect(mockPush).toHaveBeenCalled();
    const pushedData = mockPush.mock.calls[0][0];
    const expected = example.out as { name: string; data?: unknown };

    if (input.method === 'POST') {
      // POST pushes body directly — name and data match
      expect(pushedData.name).toBe(expected.name);
      if (expected.data) expect(pushedData.data).toEqual(expected.data);
    } else {
      // GET pushes requestToData output (e/d params); verify event name
      expect(pushedData.e || pushedData.name).toBe(expected.name);
    }
  });
});

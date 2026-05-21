import { sourceFetch } from '../index';
import { createIngest, createMockLogger } from '@walkeros/core';
import type { Ingest, Source, Collector } from '@walkeros/core';
import type { Types } from '../types';

// Helper to create source context
function createSourceContext(
  config: Partial<Source.Config<Types>> = {},
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  const baseEnv = env as Types['env'];
  return {
    config,
    env: baseEnv,
    logger: env.logger || createMockLogger(),
    id: 'test-fetch',
    collector: {} as Collector.Instance,
    withScope: async (_raw, respond, body) => {
      const ingest: Ingest = createIngest('test-fetch');
      return body({
        ...baseEnv,
        push: baseEnv.push,
        ingest,
        respond,
      });
    },
  };
}

describe('logger usage', () => {
  it('should forward events without runtime validation', async () => {
    // The source no longer validates event shape — events are forwarded as-is
    // and any downstream rejection is the collector/destination's concern.
    const mockLogger = createMockLogger();
    const mockPush = jest
      .fn()
      .mockResolvedValue({ event: { id: 'forwarded' } });

    const source = await sourceFetch(
      createSourceContext(
        {},
        {
          push: mockPush as never,
          command: jest.fn() as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      ),
    );

    const request = new Request('https://example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { title: 'Missing name' } }),
    });

    const response = await source.push(request);

    // No validation rejection — event is forwarded successfully.
    expect(response.status).toBe(200);
    expect(mockPush).toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should NOT log routine operations', async () => {
    const mockLogger = createMockLogger();

    const source = await sourceFetch(
      createSourceContext(
        {},
        {
          push: jest.fn().mockResolvedValue({ event: { id: 'test' } }) as never,
          command: jest.fn() as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      ),
    );

    const request = new Request('https://example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'page view' }),
    });

    await source.push(request);

    // Should NOT log routine processing
    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });
});

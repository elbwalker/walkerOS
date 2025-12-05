import { sourceFetch } from '../index';
import { createMockLogger } from '@walkeros/core';

describe('logger usage', () => {
  it('should use logger.throw for validation errors', async () => {
    const mockLogger = createMockLogger();

    const source = await sourceFetch(
      {},
      {
        push: jest.fn() as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger: mockLogger,
      },
    );

    const request = new Request('https://example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { title: 'Missing name' } }),
    });

    const response = await source.push(request);

    // Should NOT throw (catches internally and returns error response)
    expect(response.status).toBe(400);
    // But should have logged the error
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should NOT log routine operations', async () => {
    const mockLogger = createMockLogger();

    const source = await sourceFetch(
      {},
      {
        push: jest.fn().mockResolvedValue({ event: { id: 'test' } }) as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger: mockLogger,
      },
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

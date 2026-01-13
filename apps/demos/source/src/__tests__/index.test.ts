import { startFlow } from '@walkeros/collector';
import type { WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceDemo } from '../index';

describe('Demo Source', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initializes without errors', async () => {
    const { collector } = await startFlow({
      sources: {
        demo: {
          code: sourceDemo,
          config: {
            settings: {
              events: [],
            },
          },
        },
      },
    });

    expect(collector.sources.demo).toBeDefined();
    expect(collector.sources.demo.type).toBe('demo');
  });

  test('pushes events without delay immediately', async () => {
    const mockPush = jest.fn(async () => ({
      ok: true,
    }));

    const { collector } = await startFlow();
    collector.push = mockPush;

    await sourceDemo({
      collector,
      config: {
        settings: {
          events: [
            { name: 'page view', data: { title: 'Home' } },
            { name: 'product view', data: { id: 'P123' } },
          ],
        },
      },
      env: {
        elb: collector.push as unknown as WalkerOS.Elb,
        push: collector.push,
        command: collector.command,
        logger: createMockLogger(),
      },
      id: 'test-source',
      logger: createMockLogger(),
    });

    // Fast-forward to execute setTimeout(..., 0)
    jest.runAllTimers();
    await Promise.resolve();

    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'page view' }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'product view' }),
    );
  });

  test('pushes events with delay after timeout', async () => {
    const mockPush = jest.fn(async () => ({
      ok: true,
    }));

    const { collector } = await startFlow();
    collector.push = mockPush;

    await sourceDemo({
      collector,
      config: {
        settings: {
          events: [
            { name: 'immediate', data: {} },
            { name: 'delayed', data: {}, delay: 1000 },
            { name: 'more delayed', data: {}, delay: 2000 },
          ],
        },
      },
      env: {
        elb: collector.push as unknown as WalkerOS.Elb,
        push: collector.push,
        command: collector.command,
        logger: createMockLogger(),
      },
      id: 'test-source',
      logger: createMockLogger(),
    });

    // Immediate event fires
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'immediate' }),
    );

    // First delayed event fires
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'delayed' }),
    );

    // Second delayed event fires
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(mockPush).toHaveBeenCalledTimes(3);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'more delayed' }),
    );
  });

  test('handles empty events array', async () => {
    const mockPush = jest.fn(async () => ({
      ok: true,
    }));

    const { collector } = await startFlow();
    collector.push = mockPush;

    await sourceDemo({
      collector,
      config: {
        settings: {
          events: [],
        },
      },
      env: {
        elb: collector.push as unknown as WalkerOS.Elb,
        push: collector.push,
        command: collector.command,
        logger: createMockLogger(),
      },
      id: 'test-source',
      logger: createMockLogger(),
    });

    jest.runAllTimers();
    await Promise.resolve();

    expect(mockPush).not.toHaveBeenCalled();
  });
});

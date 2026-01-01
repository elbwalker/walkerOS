import type { WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { processorDemo } from '../index';
import type { Types } from '../types';

describe('Demo Processor', () => {
  const mockCollector = {} as any;

  // Use 'as any' to bypass strict type checking in tests
  const createContext = () =>
    ({
      collector: mockCollector,
      config: {},
      env: {},
      logger: createMockLogger(),
    }) as any;

  const createEvent = (
    overrides: Partial<WalkerOS.DeepPartialEvent> = {},
  ): WalkerOS.DeepPartialEvent => ({
    name: 'page view',
    data: { title: 'Home' },
    ...overrides,
  });

  test('initializes and logs init message', async () => {
    const mockLog = jest.fn();
    const instance = await processorDemo({}, { log: mockLog });

    await instance.init!(createContext());

    expect(mockLog).toHaveBeenCalledWith('[processor-demo] initialized');
  });

  test('logs full event when fields not specified', async () => {
    const mockLog = jest.fn();
    const instance = await processorDemo(
      { settings: { name: 'full' } },
      { log: mockLog },
    );

    const event = createEvent();
    await instance.push(event, createContext());

    expect(mockLog).toHaveBeenCalledTimes(1);
    const logCall = mockLog.mock.calls[0][0];
    expect(logCall).toContain('[full]');
    expect(logCall).toContain('"name": "page view"');
    expect(logCall).toContain('"title": "Home"');
  });

  test('logs only specified fields with dot notation', async () => {
    const mockLog = jest.fn();
    const instance = await processorDemo(
      {
        settings: {
          name: 'filtered',
          fields: ['name', 'data.title'],
        },
      },
      { log: mockLog },
    );

    const event = createEvent({
      data: { title: 'Home', path: '/home' },
    });
    await instance.push(event, createContext());

    const logCall = mockLog.mock.calls[0][0];
    expect(logCall).toContain('[filtered]');
    expect(logCall).toContain('"name": "page view"');
    expect(logCall).toContain('"data.title": "Home"');
    expect(logCall).not.toContain('path');
  });

  test('returns void for passthrough by default', async () => {
    const mockLog = jest.fn();
    const instance = await processorDemo({}, { log: mockLog });

    const event = createEvent();
    const result = await instance.push(event, createContext());

    expect(result).toBeUndefined();
  });

  test('returns modified event when addProcessedFlag is true', async () => {
    const mockLog = jest.fn();
    const instance = await processorDemo(
      {
        settings: {
          name: 'modifier',
          addProcessedFlag: true,
        },
      },
      { log: mockLog },
    );

    const event = createEvent();
    const result = await instance.push(event, createContext());

    expect(result).toBeDefined();
    expect((result as any).data._processed).toBe(true);
    expect((result as any).data._processedBy).toBe('modifier');
  });

  test('preserves existing event data when adding processed flag', async () => {
    const mockLog = jest.fn();
    const instance = await processorDemo(
      {
        settings: {
          addProcessedFlag: true,
        },
      },
      { log: mockLog },
    );

    const event = createEvent({
      data: { title: 'Home', custom: 'value' },
    });
    const result = await instance.push(event, createContext());

    expect((result as any).data.title).toBe('Home');
    expect((result as any).data.custom).toBe('value');
    expect((result as any).data._processed).toBe(true);
  });

  test('uses console.log when env.log not provided', async () => {
    const originalLog = console.log;
    console.log = jest.fn();

    const instance = await processorDemo({}, {});
    const event = createEvent();
    await instance.push(event, createContext());

    expect(console.log).toHaveBeenCalled();

    console.log = originalLog;
  });

  test('handles missing nested values gracefully', async () => {
    const mockLog = jest.fn();
    const instance = await processorDemo(
      {
        settings: {
          fields: ['name', 'missing.path', 'data.missing'],
        },
      },
      { log: mockLog },
    );

    const event = createEvent({
      data: { exists: true },
    });
    await instance.push(event, createContext());

    const logCall = mockLog.mock.calls[0][0];
    expect(logCall).toContain('"name": "page view"');
    expect(logCall).not.toContain('missing');
  });

  test('has correct type property', async () => {
    const instance = await processorDemo({}, {});
    expect(instance.type).toBe('demo');
  });
});

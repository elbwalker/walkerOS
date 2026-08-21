import type { Destination as CoreDestination, WalkerOS } from '@walkeros/core';
import type { DestinationAPI } from '.';
import {
  createEvent,
  getEvent,
  clone,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { examples } from './dev';

describe('Destination API', () => {
  const mockSendServer = jest.fn();

  let destination: DestinationAPI.Destination;
  let event: WalkerOS.Event;
  const url = 'https://api.example.com/';

  // Create test environment using clone and modify sendServer function
  const testEnv = clone(examples.env.standard);
  testEnv.sendServer = mockSendServer;

  const mockLogger = createMockLogger();

  beforeEach(async () => {
    jest.clearAllMocks();

    destination = jest.requireActual('.').default;
    event = createEvent();
  });

  test('init', async () => {
    // Test with no URL - should not call sendServer
    await destination.push(
      event,
      createMockContext({
        config: {},
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendServer).not.toHaveBeenCalled();

    // Test with URL - should call sendServer
    await destination.push(
      event,
      createMockContext({
        config: { settings: { url } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendServer).toHaveBeenCalledTimes(1);

    const [calledUrl, calledData, calledOptions] = mockSendServer.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(JSON.parse(calledData)).toEqual(event);
    expect(calledOptions).toEqual(
      expect.objectContaining({
        method: undefined,
        headers: undefined,
        timeout: undefined,
      }),
    );
  });

  test('environment customization', async () => {
    const customSendServer = jest.fn();
    const customEnv = { sendServer: customSendServer };

    await destination.push(
      event,
      createMockContext({
        config: { settings: { url } },
        env: customEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );

    expect(customSendServer).toHaveBeenCalledTimes(1);
    expect(customSendServer).toHaveBeenCalledWith(
      url,
      JSON.stringify(event),
      expect.objectContaining({}),
    );

    // Verify mockSendServer was not called
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('transform', async () => {
    await destination.push(
      event,
      createMockContext({
        config: { settings: { url, transform: () => 'transformed' } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', async () => {
    await destination.push(
      event,
      createMockContext({
        config: { settings: { url, headers: { foo: 'bar' } } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', async () => {
    await destination.push(
      event,
      createMockContext({
        config: { settings: { url, method: 'POST' } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('timeout', async () => {
    await destination.push(
      event,
      createMockContext({
        config: { settings: { url, timeout: 10000 } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        timeout: 10000,
      }),
    );
  });

  test('event entity action', async () => {
    await destination.push(
      event,
      createMockContext({
        config: {
          settings: { url },
          mapping: { entity: { action: { data: 'data' } } },
        },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );

    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      JSON.stringify(event),
      expect.any(Object),
    );
  });

  test('logging', async () => {
    const testLogger = createMockLogger();

    await destination.push(
      event,
      createMockContext({
        config: { settings: { url, method: 'PUT' } },
        env: testEnv,
        logger: testLogger,
        id: 'test-api',
      }),
    );

    expect(testLogger.debug).toHaveBeenCalledWith(
      'API destination sending request',
      expect.objectContaining({
        url,
        method: 'PUT',
        eventName: event.name,
      }),
    );

    expect(testLogger.debug).toHaveBeenCalledWith(
      'API destination response',
      expect.objectContaining({ ok: undefined }),
    );
  });

  describe('pushBatch', () => {
    const batchOf = (
      entries: Array<CoreDestination.BatchEntry<DestinationAPI.Mapping>>,
    ): CoreDestination.Batch<DestinationAPI.Mapping> => ({
      key: '* *',
      entries,
      events: entries.map((entry) => entry.event),
      data: entries.flatMap((entry) => (entry.data ? [entry.data] : [])),
    });

    test('is exposed so the collector engages config.batch', () => {
      expect(typeof destination.pushBatch).toBe('function');
    });

    test('sends one request per batch carrying every event', async () => {
      const events = [getEvent('product view'), getEvent('order complete')];

      await destination.pushBatch!(
        batchOf(events.map((e) => ({ event: e }))),
        createMockContext({
          config: { settings: { url } },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(mockSendServer).toHaveBeenCalledTimes(1);
      const [calledUrl, calledData] = mockSendServer.mock.calls[0];
      expect(calledUrl).toBe(url);
      expect(JSON.parse(calledData)).toEqual(events);
    });

    test('sends entry data when present, raw event otherwise', async () => {
      const first = getEvent('product view');
      const second = getEvent('order complete');
      const mapped = { custom: 'data' };

      await destination.pushBatch!(
        batchOf([{ event: first, data: mapped }, { event: second }]),
        createMockContext({
          config: { settings: { url } },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(mockSendServer).toHaveBeenCalledTimes(1);
      const [, calledData] = mockSendServer.mock.calls[0];
      expect(JSON.parse(calledData)).toEqual([mapped, second]);
    });

    test('applies transform to each batch item', async () => {
      const events = [getEvent('product view'), getEvent('order complete')];
      const transformFn = jest.fn(
        (data?: unknown) => `wrapped:${JSON.stringify(data)}`,
      );
      const transform: DestinationAPI.Transform = transformFn;

      await destination.pushBatch!(
        batchOf(events.map((e) => ({ event: e }))),
        createMockContext({
          config: { settings: { url, transform } },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(transformFn).toHaveBeenCalledTimes(2);
      expect(mockSendServer).toHaveBeenCalledTimes(1);
      const [, calledData] = mockSendServer.mock.calls[0];
      expect(JSON.parse(calledData)).toEqual(
        events.map((e) => `wrapped:${JSON.stringify(e)}`),
      );
    });

    test('sends nothing without a url', async () => {
      await destination.pushBatch!(
        batchOf([{ event: getEvent('product view') }]),
        createMockContext({
          config: {},
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(mockSendServer).not.toHaveBeenCalled();
    });

    test('forwards headers, method and timeout', async () => {
      await destination.pushBatch!(
        batchOf([{ event: getEvent('product view') }]),
        createMockContext({
          config: {
            settings: {
              url,
              headers: { foo: 'bar' },
              method: 'PUT',
              timeout: 10000,
            },
          },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(mockSendServer).toHaveBeenCalledWith(
        url,
        expect.any(String),
        expect.objectContaining({
          headers: { foo: 'bar' },
          method: 'PUT',
          timeout: 10000,
        }),
      );
    });

    test('environment customization', async () => {
      const customSendServer = jest.fn();

      await destination.pushBatch!(
        batchOf([{ event: getEvent('product view') }]),
        createMockContext({
          config: { settings: { url } },
          env: { sendServer: customSendServer },
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(customSendServer).toHaveBeenCalledTimes(1);
      expect(mockSendServer).not.toHaveBeenCalled();
    });

    test('logging', async () => {
      const testLogger = createMockLogger();
      const events = [getEvent('product view'), getEvent('order complete')];

      await destination.pushBatch!(
        batchOf(events.map((e) => ({ event: e }))),
        createMockContext({
          config: { settings: { url, method: 'PUT' } },
          env: testEnv,
          logger: testLogger,
          id: 'test-api',
        }),
      );

      expect(testLogger.debug).toHaveBeenCalledWith(
        'API destination sending batch',
        expect.objectContaining({ url, method: 'PUT', events: 2 }),
      );

      expect(testLogger.debug).toHaveBeenCalledWith(
        'API destination response',
        expect.objectContaining({ ok: undefined }),
      );
    });
  });
});

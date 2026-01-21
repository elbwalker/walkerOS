import type { WalkerOS, Collector } from '@walkeros/core';
import type { DestinationAPI } from '.';
import { createEvent, clone, createMockLogger } from '@walkeros/core';
import { examples } from '.';

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
    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: {},
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendServer).not.toHaveBeenCalled();

    // Test with URL - should call sendServer
    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: { settings: { url } },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
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

    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url },
      },
      env: customEnv,
      logger: mockLogger,
      id: 'test-api',
    });

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
    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, transform: () => 'transformed' },
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', async () => {
    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, headers: { foo: 'bar' } },
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', async () => {
    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, method: 'POST' },
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('timeout', async () => {
    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, timeout: 10000 },
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        timeout: 10000,
      }),
    );
  });

  test('event entity action', async () => {
    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url },
        mapping: examples.mapping.config,
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });

    expect(mockSendServer).toHaveBeenCalledWith(
      url,
      JSON.stringify(event),
      expect.any(Object),
    );
  });

  test('logging', async () => {
    const testLogger = createMockLogger();

    await destination.push(event, {
      collector: {} as Collector.Instance,
      config: { settings: { url, method: 'PUT' } },
      env: testEnv,
      logger: testLogger,
      id: 'test-api',
    });

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
});

import type { WalkerOS, Collector } from '@walkeros/core';
import type { DestinationAPI } from '.';
import { startFlow } from '@walkeros/collector';
import { createEvent, getEvent, clone, createMockLogger } from '@walkeros/core';
import { examples } from './dev';

describe('Destination API', () => {
  const mockSendWeb = jest.fn(); //.mockImplementation(console.log);

  let destination: DestinationAPI.Destination;
  let event: WalkerOS.Event;
  const url = 'https://api.example.com/';

  // Create test environment using clone and modify sendWeb function
  const testEnv = clone(examples.env.push);
  testEnv.sendWeb = mockSendWeb;

  // Mock logger
  const mockLogger = createMockLogger();

  beforeEach(async () => {
    jest.clearAllMocks();

    destination = jest.requireActual('.').default;
    event = createEvent();
    await startFlow({
      tagging: 2,
    });
  });

  test('push', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: { settings: { url } },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendWeb).toHaveBeenCalledTimes(1);

    const [calledUrl, calledData, calledOptions] = mockSendWeb.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(JSON.parse(calledData)).toEqual(event);
    expect(calledOptions).toEqual(
      expect.objectContaining({
        transport: 'fetch',
      }),
    );
  });

  test('environment customization', () => {
    const customSendWeb = jest.fn();
    const customEnv = { sendWeb: customSendWeb };

    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url },
      },
      env: customEnv,
      logger: mockLogger,
      id: 'test-api',
    });

    expect(customSendWeb).toHaveBeenCalledTimes(1);
    expect(customSendWeb).toHaveBeenCalledWith(
      url,
      JSON.stringify(event),
      expect.objectContaining({ transport: 'fetch' }),
    );

    // Verify mockSendWeb was not called
    expect(mockSendWeb).not.toHaveBeenCalled();
  });

  test('transform', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, transform: () => 'transformed' },
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, headers: { foo: 'bar' } },
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, method: 'POST' },
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('event entity action', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url },
        mapping: examples.mapping.config,
      },
      env: testEnv,
      logger: mockLogger,
      id: 'test-api',
    });

    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      JSON.stringify(event),
      expect.any(Object),
    );
  });

  describe('init', () => {
    test('throws when url missing', () => {
      expect(() =>
        destination.init!({
          collector: {} as Collector.Instance,
          config: {},
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      ).toThrow('Config settings url missing');
    });

    test('succeeds when url provided', () => {
      expect(() =>
        destination.init!({
          collector: {} as Collector.Instance,
          config: { settings: { url } },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      ).not.toThrow();
    });
  });

  describe('pushBatch', () => {
    test('sends array of events', () => {
      const events = [getEvent('product view'), getEvent('product click')];
      const batch = {
        key: 'product view',
        events,
        data: [],
      };

      destination.pushBatch!(batch, {
        collector: {} as Collector.Instance,
        config: { settings: { url } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      });

      expect(mockSendWeb).toHaveBeenCalledTimes(1);
      const [calledUrl, calledData] = mockSendWeb.mock.calls[0];
      expect(calledUrl).toBe(url);
      expect(JSON.parse(calledData)).toEqual(events);
    });

    test('prefers batch.data over batch.events', () => {
      const events = [getEvent('product view')];
      const mappedData = [{ custom: 'data1' }, { custom: 'data2' }];
      const batch = {
        key: 'product view',
        events,
        data: mappedData,
      };

      destination.pushBatch!(batch, {
        collector: {} as Collector.Instance,
        config: { settings: { url } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      });

      expect(mockSendWeb).toHaveBeenCalledTimes(1);
      const [, calledData] = mockSendWeb.mock.calls[0];
      expect(JSON.parse(calledData)).toEqual(mappedData);
    });

    test('applies transform to each batch item', () => {
      const events = [getEvent('product view'), getEvent('product click')];
      const batch = {
        key: 'product view',
        events,
        data: [],
      };

      const transform = jest.fn((data) =>
        JSON.stringify({ transformed: true, original: data }),
      ) as DestinationAPI.Transform;

      destination.pushBatch!(batch, {
        collector: {} as Collector.Instance,
        config: { settings: { url, transform } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      });

      expect(transform).toHaveBeenCalledTimes(2);
      expect(mockSendWeb).toHaveBeenCalledTimes(1);
      const [, calledData] = mockSendWeb.mock.calls[0];
      const parsed = JSON.parse(calledData);
      expect(parsed).toHaveLength(2);
      expect(JSON.parse(parsed[0])).toEqual({
        transformed: true,
        original: events[0],
      });
    });
  });
});

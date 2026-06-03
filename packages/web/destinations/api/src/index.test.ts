import type { WalkerOS } from '@walkeros/core';
import type { DestinationAPI } from '.';
import { startFlow } from '@walkeros/collector';
import {
  createEvent,
  getEvent,
  clone,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
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
    await startFlow();
  });

  test('push', () => {
    destination.push(
      event,
      createMockContext({
        config: { settings: { url } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
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

    destination.push(
      event,
      createMockContext({
        config: { settings: { url } },
        env: customEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );

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
    destination.push(
      event,
      createMockContext({
        config: { settings: { url, transform: () => 'transformed' } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', () => {
    destination.push(
      event,
      createMockContext({
        config: { settings: { url, headers: { foo: 'bar' } } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', () => {
    destination.push(
      event,
      createMockContext({
        config: { settings: { url, method: 'POST' } },
        env: testEnv,
        logger: mockLogger,
        id: 'test-api',
      }),
    );
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('event entity action', () => {
    destination.push(
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

    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      JSON.stringify(event),
      expect.any(Object),
    );
  });

  describe('init', () => {
    test('throws when url missing', () => {
      expect(() =>
        destination.init!(
          createMockContext({
            config: {},
            env: testEnv,
            logger: mockLogger,
            id: 'test-api',
          }),
        ),
      ).toThrow('Config settings url missing');
    });

    test('succeeds when url provided', () => {
      expect(() =>
        destination.init!(
          createMockContext({
            config: { settings: { url } },
            env: testEnv,
            logger: mockLogger,
            id: 'test-api',
          }),
        ),
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
        entries: events.map((event) => ({ event })),
      };

      destination.pushBatch!(
        batch,
        createMockContext({
          config: { settings: { url } },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(mockSendWeb).toHaveBeenCalledTimes(1);
      const [calledUrl, calledData] = mockSendWeb.mock.calls[0];
      expect(calledUrl).toBe(url);
      expect(JSON.parse(calledData)).toEqual(events);
    });

    test('sends entry data when present, raw event otherwise', () => {
      const e0 = getEvent('product view');
      const e1 = getEvent('product click');
      const mapped = { custom: 'data1' };
      const batch = {
        key: 'product view',
        events: [e0, e1],
        data: [mapped],
        entries: [{ event: e0, data: mapped }, { event: e1 }],
      };

      destination.pushBatch!(
        batch,
        createMockContext({
          config: { settings: { url } },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(mockSendWeb).toHaveBeenCalledTimes(1);
      const [, calledData] = mockSendWeb.mock.calls[0];
      expect(JSON.parse(calledData)).toEqual([mapped, e1]);
    });

    test('delivers every entry when some have mapped data and some do not', () => {
      const e0 = getEvent('product view');
      const e1 = getEvent('product click');
      const mapped = { mapped: 1 };
      const batch = {
        key: 'product view',
        events: [e0, e1], // derived back-compat view
        data: [mapped], // compacted, length 1 -- the bug condition
        // Entry 1 has the mapped data; the compacted `data[0]` would otherwise
        // cross-assign it to e0 and drop e1.
        entries: [{ event: e0 }, { event: e1, data: mapped }],
      };

      destination.pushBatch!(
        batch,
        createMockContext({
          config: { settings: { url } },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

      expect(mockSendWeb).toHaveBeenCalledTimes(1);
      const [, calledData] = mockSendWeb.mock.calls[0];
      expect(JSON.parse(calledData)).toEqual([e0, mapped]);
    });

    test('applies transform to each batch item', () => {
      const events = [getEvent('product view'), getEvent('product click')];
      const batch = {
        key: 'product view',
        events,
        data: [],
        entries: events.map((event) => ({ event })),
      };

      const transform = jest.fn((data) =>
        JSON.stringify({ transformed: true, original: data }),
      ) as DestinationAPI.Transform;

      destination.pushBatch!(
        batch,
        createMockContext({
          config: { settings: { url, transform } },
          env: testEnv,
          logger: mockLogger,
          id: 'test-api',
        }),
      );

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

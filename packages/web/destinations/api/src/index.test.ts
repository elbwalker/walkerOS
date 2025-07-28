import type { WalkerOS } from '@walkerOS/core';
import type { DestinationAPI } from '.';
import { createCollector } from '@walkerOS/collector';
import { createEvent } from '@walkerOS/core';
import { events, mapping } from './examples';

describe('Destination API', () => {
  let elb: WalkerOS.Elb;
  const mockSendWeb = jest.fn(); //.mockImplementation(console.log);

  jest.mock('@walkerOS/web-core', () => ({
    ...jest.requireActual('@walkerOS/web-core'),
    sendWeb: mockSendWeb,
  }));

  let destination: DestinationAPI.Destination;
  let event: WalkerOS.Event;
  const url = 'https://api.example.com/';

  beforeEach(async () => {
    jest.clearAllMocks();

    destination = jest.requireActual('.').default;
    event = createEvent();
    ({ elb } = await createCollector({
      session: false,
      tagging: 2,
    }));
  });

  test('init', async () => {
    destination.config = {};
    elb('walker destination', destination);

    await elb(event); // No url
    expect(mockSendWeb).not.toHaveBeenCalled();

    destination.config.settings = { url };
    await elb(event);
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

  test('wrapper', () => {
    const onCall = jest.fn();
    const wrap = jest.fn(
      <T extends (...args: unknown[]) => unknown>(name: string, fn: T): T => {
        return ((...args: unknown[]) => {
          onCall({ name, id: 'test-id', type: 'api' }, args);
          return fn(...args);
        }) as T;
      },
    );

    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url },
      },
      wrap,
    });

    expect(wrap).toHaveBeenCalledWith('sendWeb', mockSendWeb);
    expect(onCall).toHaveBeenCalledTimes(1);
    expect(onCall).toHaveBeenCalledWith(
      { name: 'sendWeb', id: 'test-id', type: 'api' },
      [
        url,
        JSON.stringify(event),
        expect.objectContaining({ transport: 'fetch' }),
      ],
    );
  });

  test('transform', async () => {
    elb('walker destination', destination, {
      settings: { url, transform: () => 'transformed' },
    });
    await elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', async () => {
    elb('walker destination', destination, {
      settings: { url, headers: { foo: 'bar' } },
    });
    await elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', async () => {
    elb('walker destination', destination, {
      settings: { url, method: 'POST' },
    });
    await elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('event entity action', async () => {
    elb('walker destination', destination, {
      settings: { url },
      mapping: mapping.config,
    });
    await elb(event);

    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      events.entity_action(),
      expect.any(Object),
    );
  });
});

import type { WalkerOS } from '@walkerOS/core';
import type { Elb } from '@walkerOS/web-collector';
import type { DestinationAPI } from '.';
import { createWebCollector } from '@walkerOS/web-collector';
import { createEvent } from '@walkerOS/core';
import { events, mapping } from './examples';

describe('Destination API', () => {
  let elb: Elb.Fn;
  const mockSendWeb = jest.fn(); //.mockImplementation(console.log);

  jest.mock('@walkerOS/web-collector', () => ({
    ...jest.requireActual('@walkerOS/web-collector'),
    sendWeb: mockSendWeb,
  }));

  let destination: DestinationAPI.Destination;
  let event: WalkerOS.Event;
  const url = 'https://api.example.com/';

  beforeEach(() => {
    jest.clearAllMocks();

    destination = jest.requireActual('.').default;
    event = createEvent();
    ({ elb } = createWebCollector({
      session: false,
      pageview: false,
      run: true,
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

  test('fn', () => {
    const fn = jest.fn();
    destination.push(event, { config: { settings: { url }, fn } });
    expect(fn).toHaveBeenCalledTimes(1);
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

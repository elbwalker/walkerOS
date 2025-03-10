import type { WalkerOS } from '@elbwalker/types';
import type { DestinationWebAPI } from '.';
import { createEvent } from '@elbwalker/utils';
import { elb, Walkerjs } from '@elbwalker/walker.js';
import { events, mapping } from '../examples';

describe('Destination API', () => {
  const mockSendWeb = jest.fn(); //.mockImplementation(console.log);

  jest.mock('@elbwalker/utils/web', () => ({
    ...jest.requireActual('@elbwalker/utils/web'),
    sendWeb: mockSendWeb,
  }));

  let destination: DestinationWebAPI.Destination;
  let event: WalkerOS.Event;
  const url = 'https://api.example.com/';

  beforeEach(() => {
    destination = jest.requireActual('.').default;
    event = createEvent();
    Walkerjs({ pageview: false, session: false, run: true });
    jest.clearAllMocks();
  });

  test('init', () => {
    destination.config = {};
    elb('walker destination', destination);

    elb(event); // No url
    expect(mockSendWeb).not.toHaveBeenCalled();

    destination.config.custom = { url };
    elb(event);
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
    destination.push(event, { custom: { url }, fn });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('transform', () => {
    elb('walker destination', destination, {
      custom: { url, transform: () => 'transformed' },
    });
    elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', () => {
    elb('walker destination', destination, {
      custom: { url, headers: { foo: 'bar' } },
    });
    elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', () => {
    elb('walker destination', destination, {
      custom: { url, method: 'POST' },
    });
    elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('event entity action', () => {
    elb('walker destination', destination, {
      custom: { url },
      mapping: mapping.config,
    });
    elb(event);

    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      events.entity_action(),
      expect.any(Object),
    );
  });
});

import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationWebAPI } from '.';

describe('Destination API', () => {
  const w = window;
  let destination: DestinationWebAPI.Destination,
    config: DestinationWebAPI.Config;

  const mockFetch = jest.fn(); //.mockImplementation(console.log);
  const mockBeacon = jest.fn();
  const mockXHROpen = jest.fn();
  const mockXHRSend = jest.fn();
  const mockXHRHeader = jest.fn();
  const mockXHR = {
    open: mockXHROpen,
    send: mockXHRSend,
    setRequestHeader: mockXHRHeader,
    readyState: 4,
    responseText: JSON.stringify('demo'),
  };
  const oldXMLHttpRequest = w.XMLHttpRequest;
  const oldFetch = w.fetch;
  const oldBeacon = navigator.sendBeacon;

  const event = 'entity action';
  const url = 'https://api.elbwalker.com/';

  beforeEach(() => {
    destination = jest.requireActual('.').default;

    Walkerjs({ pageview: false, session: false });
    elb('walker run');

    window.fetch = mockFetch;
    navigator.sendBeacon = mockBeacon;
    Object.defineProperty(window, 'XMLHttpRequest', {
      value: jest.fn(() => mockXHR),
      writable: true,
    });
  });

  afterEach(() => {
    window.fetch = oldFetch;
    navigator.sendBeacon = oldBeacon;
    window.XMLHttpRequest = oldXMLHttpRequest;
  });

  test('init', () => {
    elb('walker destination', destination);
    elb(event);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('fetch', () => {
    config = {
      custom: { url }, // fetch as default
    };
    elb('walker destination', destination, config);
    elb(event);

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ keepalive: true }),
    );

    elb('walker destination', destination, {
      custom: { url, transport: 'fetch' },
    });
    elb(event);

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ keepalive: true }),
    );
  });

  test('beacon', () => {
    config = {
      custom: { url, transport: 'beacon' },
    };
    elb('walker destination', destination, config);
    elb(event);

    expect(mockBeacon).toHaveBeenCalledWith(url, expect.any(String));

    const sentPayload = JSON.parse(mockBeacon.mock.calls[0][1]);
    expect(sentPayload).toEqual(expect.objectContaining({ event }));
  });

  test('xhr', () => {
    config = {
      custom: { url, transport: 'xhr' },
    };
    elb('walker destination', destination, config);
    elb(event);

    expect(mockXHROpen).toHaveBeenCalledWith('POST', expect.any(String), true);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-type',
      'text/plain; charset=utf-8',
    );

    const sentPayload = JSON.parse(mockXHRSend.mock.calls[0][0]);
    expect(sentPayload).toEqual(expect.objectContaining({ event }));
  });

  test('transform event', () => {
    const eventName = 'event update';

    // Define a custom transform function
    const transform: DestinationWebAPI.Transform = jest.fn((event) => {
      return `${event.entity},transformed`;
    });

    elb('walker destination', destination, {
      custom: { url, transform },
    });

    elb(eventName);

    // Verify that the transform function is called with the correct event
    expect(transform).toHaveBeenCalledWith(
      expect.objectContaining({ event: eventName }),
      expect.any(Object),
      undefined,
    );

    // Verify that fetch is called with the updated body
    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ body: 'event,transformed' }),
    );
  });
});

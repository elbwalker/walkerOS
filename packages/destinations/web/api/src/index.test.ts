import webClient, { type WebClient } from '@elbwalker/walker.js';
import type { Function, Config, Transform } from './types';

describe('Destination API', () => {
  const w = window;
  let walkerjs: WebClient.Instance, destination: Function, config: Config;

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
    jest.clearAllMocks();
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    destination = require('.').default;

    w.elbLayer = [];

    walkerjs = webClient({ pageview: false });
    walkerjs.push('walker run');

    window.fetch = mockFetch;
    navigator.sendBeacon = mockBeacon;
    Object.defineProperty(window, 'XMLHttpRequest', {
      value: jest.fn(() => mockXHR),
      writable: true,
    });
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
    window.fetch = oldFetch;
    navigator.sendBeacon = oldBeacon;
    window.XMLHttpRequest = oldXMLHttpRequest;
  });

  test('init', () => {
    walkerjs.push('walker destination', destination);
    walkerjs.push(event);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('fetch', () => {
    config = {
      custom: { url }, // fetch as default
    };
    walkerjs.push('walker destination', destination, config);
    walkerjs.push(event);

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ keepalive: true }),
    );

    walkerjs.push('walker destination', destination, {
      custom: { url, transport: 'fetch' },
    });
    walkerjs.push(event);

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ keepalive: true }),
    );
  });

  test('beacon', () => {
    config = {
      custom: { url, transport: 'beacon' },
    };
    walkerjs.push('walker destination', destination, config);
    walkerjs.push(event);

    expect(mockBeacon).toHaveBeenCalledWith(url, expect.any(String));

    const sentPayload = JSON.parse(mockBeacon.mock.calls[0][1]);
    expect(sentPayload).toEqual(expect.objectContaining({ event }));
  });

  test('xhr', () => {
    config = {
      custom: { url, transport: 'xhr' },
    };
    walkerjs.push('walker destination', destination, config);
    walkerjs.push(event);

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
    const transform: Transform = jest.fn((event) => {
      return `${event.entity},transformed`;
    });

    walkerjs.push('walker destination', destination, {
      custom: { url, transform },
    });

    walkerjs.push(eventName);

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

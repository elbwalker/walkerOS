import Elbwalker, { IElbwalker } from '@elbwalker/walker.js';
import { DestinationAPI } from './types';

describe('Destination API', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationAPI.Function,
    config: DestinationAPI.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);
  const mockFetch = jest.fn();
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

    destination = require('.').default;

    w.elbLayer = [];

    elbwalker = Elbwalker({ pageview: false });
    elbwalker.push('walker run');

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
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('fetch', () => {
    config = {
      custom: { url }, // fetch as default
    };
    elbwalker.push('walker destination', destination, config);
    elbwalker.push(event);

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ keepalive: true }),
    );

    elbwalker.push('walker destination', destination, {
      custom: { url, transport: 'fetch' },
    });
    elbwalker.push(event);

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ keepalive: true }),
    );
  });

  test('beacon', () => {
    config = {
      custom: { url, transport: 'beacon' },
    };
    elbwalker.push('walker destination', destination, config);
    elbwalker.push(event);

    expect(mockBeacon).toHaveBeenCalledWith(url, expect.any(String));

    const sentPayload = JSON.parse(mockBeacon.mock.calls[0][1]);
    expect(sentPayload).toEqual(expect.objectContaining({ event }));
  });

  test('xhr', () => {
    config = {
      custom: { url, transport: 'xhr' },
    };
    elbwalker.push('walker destination', destination, config);
    elbwalker.push(event);

    expect(mockXHROpen).toHaveBeenCalledWith('POST', expect.any(String), true);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-type',
      'text/plain; charset=utf-8',
    );

    const sentPayload = JSON.parse(mockXHRSend.mock.calls[0][0]);
    expect(sentPayload).toEqual(expect.objectContaining({ event }));
  });
});

import { sendRequest } from '../../';

describe('send', () => {
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
  const oldXMLHttpRequest = window.XMLHttpRequest;
  const oldFetch = window.fetch;
  const oldBeacon = navigator.sendBeacon;

  const data = 'entity action';
  const url = 'https://api.elbwalker.com/';

  beforeEach(() => {
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

  test('fetch', () => {
    sendRequest(url, data);

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ body: data, keepalive: true }),
    );

    jest.clearAllMocks();
    sendRequest(url, data, { transport: 'fetch' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('beacon', () => {
    sendRequest(url, data, { transport: 'beacon' });
    expect(mockBeacon).toHaveBeenCalledWith(url, expect.any(String));
  });

  test('xhr', () => {
    sendRequest(url, data, { transport: 'xhr' });
    expect(mockXHROpen).toHaveBeenCalledWith('POST', expect.any(String), true);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-type',
      'application/json; charset=utf-8',
    );
  });
});

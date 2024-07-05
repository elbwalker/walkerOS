import { sendRequest } from '../../';

describe('send', () => {
  const mockFetch = jest.fn(
    () =>
      Promise.resolve({
        json: () => Promise.resolve('demo'),
      }) as Promise<Response>,
  );
  const mockBeacon = jest.fn(() => true);
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

  const data = { key: 'value' };
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

  test('fetch', async () => {
    await sendRequest(url, data, { transport: 'fetch' });

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ body: JSON.stringify(data), keepalive: true }),
      // @TODO expect.objectContaining({ body: (data), keepalive: true }),
    );
    // expect(await response.json()).toBe('demo');

    jest.clearAllMocks();
    // const responseWithOptions = await sendRequest(url, data, {
    //   transport: 'fetch',
    // });
    // expect(mockFetch).toHaveBeenCalledTimes(1);
    // expect(await responseWithOptions.json()).toBe('demo');
  });

  test('beacon', () => {
    const response = sendRequest(url, data, { transport: 'beacon' });
    // expect(mockBeacon).toHaveBeenCalledWith(url, (data));
    expect(response).toBe(true);
  });

  test('xhr', () => {
    const response = sendRequest(url, data, { transport: 'xhr' });
    expect(mockXHROpen).toHaveBeenCalledWith('POST', url, true);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
    expect(mockXHR.send).toHaveBeenCalledWith(JSON.stringify(data));
    expect(response).toBe(mockXHR);
    // expect(response.responseText).toBe(JSON.stringify('demo'));
  });

  test('xhr with custom headers', () => {
    const headers = { 'Custom-Header': 'customValue' };
    const response = sendRequest(url, data, {
      transport: 'xhr',
      headers,
    }) as XMLHttpRequest;
    expect(mockXHROpen).toHaveBeenCalledWith('POST', url, true);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
    expect(mockXHRHeader).toHaveBeenCalledWith('Custom-Header', 'customValue');
    expect(mockXHR.send).toHaveBeenCalledWith(JSON.stringify(data));
    expect(response).toBe(mockXHR);
    expect(response.responseText).toBe(JSON.stringify('demo'));
  });

  test('xhr with method option', () => {
    const response = sendRequest(url, data, {
      transport: 'xhr',
      method: 'PUT',
    });
    expect(mockXHROpen).toHaveBeenCalledWith('PUT', url, true);
    expect(mockXHR.send).toHaveBeenCalledWith(JSON.stringify(data));
    expect(response).toBe(mockXHR);
    // expect(response.responseText).toBe(JSON.stringify('demo'));
  });
});

import { sendWeb } from '../../web';

describe('sendWeb', () => {
  const data = { key: 'value' };
  const dataStringified = JSON.stringify({ key: 'value' });
  const url = 'https://api.elbwalker.com/';

  const mockFetch = jest.fn(
    () =>
      Promise.resolve({
        text: () => Promise.resolve(dataStringified),
        ok: true,
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
    status: 200,
    response: dataStringified,
    readyState: 4,
  };
  const oldXMLHttpRequest = window.XMLHttpRequest;
  const oldFetch = window.fetch;
  const oldBeacon = navigator.sendBeacon;

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
    const response = await sendWeb(url, data, { transport: 'fetch' });

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        body: dataStringified,
        keepalive: true,
        mode: 'cors',
      }),
    );
    expect(response).toStrictEqual({
      ok: true,
      data: dataStringified,
      error: undefined,
    });
  });

  test('fetch cors', async () => {
    const response = await sendWeb(url, data, {
      transport: 'fetch',
      noCors: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        body: dataStringified,
        keepalive: true,
        mode: 'no-cors',
      }),
    );
    expect(response).toStrictEqual({
      ok: true,
      data: '',
      error: undefined,
    });
  });

  test('fetch credentials', async () => {
    const response = await sendWeb(url, data, {
      transport: 'fetch',
      credentials: 'include',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        body: dataStringified,
        keepalive: true,
        credentials: 'include',
      }),
    );
    expect(response).toStrictEqual({
      ok: true,
      data: dataStringified,
      error: undefined,
    });
  });

  test('beacon', () => {
    const response = sendWeb(url, data, { transport: 'beacon' });
    expect(mockBeacon).toHaveBeenCalledWith(url, dataStringified);
    expect(response).toStrictEqual({ ok: true, error: undefined });
  });

  test('xhr', () => {
    const response = sendWeb(url, data, { transport: 'xhr' });
    expect(mockXHROpen).toHaveBeenCalledWith('POST', url, false);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
    expect(mockXHR.send).toHaveBeenCalledWith(dataStringified);
    expect(response).toStrictEqual({
      ok: true,
      data,
      error: undefined,
    });
  });

  test('xhr with custom headers', () => {
    const headers = { 'Custom-Header': 'customValue' };
    const response = sendWeb(url, data, {
      transport: 'xhr',
      headers,
    });

    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
    expect(mockXHRHeader).toHaveBeenCalledWith('Custom-Header', 'customValue');
    expect(mockXHR.send).toHaveBeenCalledWith(dataStringified);
    expect(response).toStrictEqual({
      ok: true,
      data,
      error: undefined,
    });
  });

  test('xhr with method option', () => {
    const response = sendWeb(url, data, {
      transport: 'xhr',
      method: 'PUT',
    });
    expect(mockXHROpen).toHaveBeenCalledWith('PUT', url, false);
    expect(mockXHR.send).toHaveBeenCalledWith(dataStringified);
    expect(response).toStrictEqual({
      ok: true,
      data,
      error: undefined,
    });
  });
});

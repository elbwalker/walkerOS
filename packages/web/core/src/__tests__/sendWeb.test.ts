import { sendWeb } from '..';

describe('sendWeb', () => {
  const data = { key: 'value' };
  const dataStringified = JSON.stringify({ key: 'value' });
  const url = 'https://api.walkeros.io/';

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

  describe('timeout validation', () => {
    // A fetch that hangs until the abort signal fires, then rejects.
    const makeHangingFetch = () =>
      jest.fn(
        (_input: URL | RequestInfo, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            signal?.addEventListener('abort', () => {
              reject(new Error('The operation was aborted.'));
            });
          }),
      );

    test('falls back to DEFAULT_FETCH_TIMEOUT when timeout is 0', async () => {
      // Guard must replace 0 with DEFAULT_FETCH_TIMEOUT (10000).
      // Advancing 5000ms should NOT have aborted yet (abort is at 10000).
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
      window.fetch = makeHangingFetch();
      sendWeb(url, data, { transport: 'fetch', timeout: 0 });
      jest.advanceTimersByTime(5000);
      expect(abortSpy).not.toHaveBeenCalled();
    });

    test('falls back to DEFAULT_FETCH_TIMEOUT when timeout is negative', async () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
      window.fetch = makeHangingFetch();
      sendWeb(url, data, { transport: 'fetch', timeout: -1 });
      jest.advanceTimersByTime(5000);
      expect(abortSpy).not.toHaveBeenCalled();
    });

    test('falls back to DEFAULT_FETCH_TIMEOUT when timeout is NaN', async () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
      window.fetch = makeHangingFetch();
      sendWeb(url, data, { transport: 'fetch', timeout: NaN });
      jest.advanceTimersByTime(5000);
      expect(abortSpy).not.toHaveBeenCalled();
    });

    test('honors an explicit positive finite timeout', async () => {
      window.fetch = makeHangingFetch();
      const promise = sendWeb(url, data, { transport: 'fetch', timeout: 50 });
      jest.advanceTimersByTime(50);
      const response = await promise;
      expect(response.ok).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('fetch timeout', () => {
    test('fetch rejects with timeout error when request exceeds timeout', async () => {
      // Never resolves on its own; rejects only when the signal aborts.
      const abortingFetch = jest.fn(
        (_input: URL | RequestInfo, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            signal?.addEventListener('abort', () => {
              reject(new Error('The operation was aborted.'));
            });
          }),
      );
      window.fetch = abortingFetch;

      const promise = sendWeb(url, data, {
        transport: 'fetch',
        timeout: 50,
      });

      // Advance fake timers so the AbortController's setTimeout fires.
      jest.advanceTimersByTime(50);

      const response = await promise;

      expect(response.ok).toBe(false);
      expect(response.error).toBeDefined();
    });

    test('fetch uses default timeout when none specified', async () => {
      const okFetch = jest.fn(
        () =>
          Promise.resolve({
            text: () => Promise.resolve(''),
            ok: true,
          }) as Promise<Response>,
      );
      window.fetch = okFetch;

      await sendWeb(url, data, { transport: 'fetch' });

      expect(okFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    test('fetch succeeds within timeout', async () => {
      const okFetch = jest.fn(
        () =>
          Promise.resolve({
            text: () => Promise.resolve(dataStringified),
            ok: true,
          }) as Promise<Response>,
      );
      window.fetch = okFetch;

      const response = await sendWeb(url, data, {
        transport: 'fetch',
        timeout: 5000,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBe(dataStringified);
    });
  });
});

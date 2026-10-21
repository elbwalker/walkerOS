import { StepError } from '@walkeros/core';
import { sendWeb } from '..';

type BodyMethod<K extends keyof Response> = ReturnType<
  Extract<Response[K], () => unknown>
>;

/** A Response for jsdom, which has no fetch API of its own. */
class FakeResponse implements Response {
  readonly headers = new Headers();
  readonly redirected = false;
  readonly type: ResponseType = 'basic';
  readonly url = '';
  readonly body = null;
  readonly bodyUsed = false;
  readonly ok: boolean;

  constructor(
    private readonly content: string,
    readonly status = 200,
    readonly statusText = '',
  ) {
    this.ok = status >= 200 && status < 300;
  }

  clone(): Response {
    return new FakeResponse(this.content, this.status, this.statusText);
  }
  text(): Promise<string> {
    return Promise.resolve(this.content);
  }
  json(): Promise<unknown> {
    return Promise.resolve(JSON.parse(this.content));
  }
  arrayBuffer(): BodyMethod<'arrayBuffer'> {
    return Promise.reject(new Error('unsupported'));
  }
  blob(): BodyMethod<'blob'> {
    return Promise.reject(new Error('unsupported'));
  }
  bytes(): BodyMethod<'bytes'> {
    return Promise.reject(new Error('unsupported'));
  }
  formData(): BodyMethod<'formData'> {
    return Promise.reject(new Error('unsupported'));
  }
}

describe('sendWeb', () => {
  const data = { key: 'value' };
  const dataStringified = JSON.stringify({ key: 'value' });
  const url = 'https://api.walkeros.io/';

  const mockFetch = jest.fn(
    (_input: URL | RequestInfo, _init?: RequestInit): Promise<Response> =>
      Promise.resolve(new FakeResponse(dataStringified)),
  );
  const mockBeacon = jest.fn((_url: string, _body?: BodyInit | null) => true);
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
    mockXHR.status = 200;
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

  test('fetch resolves with the data', async () => {
    const response = await sendWeb(url, data, { transport: 'fetch' });

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        body: dataStringified,
        keepalive: true,
        mode: 'cors',
      }),
    );
    expect(response).toStrictEqual({ data: dataStringified });
  });

  test('a noCors fetch resolves once the request completes (opaque counts as sent)', async () => {
    mockFetch.mockResolvedValueOnce(new FakeResponse('', 0));
    const response = await sendWeb(url, data, {
      transport: 'fetch',
      noCors: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ mode: 'no-cors' }),
    );
    expect(response).toStrictEqual({ data: '' });
  });

  test('fetch credentials', async () => {
    await sendWeb(url, data, { transport: 'fetch', credentials: 'include' });

    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  test('a 503 throws a retryable StepError with status and body, the body never in the message', async () => {
    mockFetch.mockResolvedValueOnce(
      new FakeResponse('{"error":"user@example.com"}', 503, 'Busy'),
    );
    const sent = sendWeb(url, data, { transport: 'fetch' });

    await expect(sent).rejects.toBeInstanceOf(StepError);
    await sent.catch((error: unknown) => {
      expect(error).toMatchObject({
        code: 'transport',
        status: 503,
        retryable: true,
        body: '{"error":"user@example.com"}',
        message: 'HTTP 503',
      });
    });
  });

  test('a 400 throws a StepError that is not retryable', async () => {
    mockFetch.mockResolvedValueOnce(new FakeResponse('bad', 400));
    await expect(
      sendWeb(url, data, { transport: 'fetch' }),
    ).rejects.toMatchObject({
      code: 'transport',
      status: 400,
      retryable: false,
    });
  });

  test('a network error keeps its cause code in the message, never the address', async () => {
    const cause = Object.assign(
      new Error('getaddrinfo ENOTFOUND vendor.example?key=secret'),
      { code: 'ENOTFOUND' },
    );
    mockFetch.mockRejectedValueOnce(
      Object.assign(new TypeError('fetch failed'), { cause }),
    );
    await expect(
      sendWeb(url, data, { transport: 'fetch' }),
    ).rejects.toMatchObject({
      code: 'transport',
      message: 'fetch failed (ENOTFOUND)',
    });
  });

  test('a network error throws code transport', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(
      sendWeb(url, data, { transport: 'fetch' }),
    ).rejects.toMatchObject({ code: 'transport', retryable: true });
  });

  test('keepalive stops once the bodies in flight would exceed 64 KiB', async () => {
    const releases: Array<() => void> = [];
    mockFetch.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          releases.push(() => resolve(new FakeResponse('')));
        }),
    );
    const body = 'x'.repeat(30 * 1024);

    const sends = [1, 2, 3].map(() =>
      sendWeb(url, body, { transport: 'fetch' }),
    );
    expect(mockFetch.mock.calls.map(([, init]) => init?.keepalive)).toEqual([
      true,
      true,
      false,
    ]);

    releases.forEach((release) => release());
    await Promise.all(sends);

    // The quota is free again once the requests settled.
    mockFetch.mockImplementation(() => Promise.resolve(new FakeResponse('')));
    await sendWeb(url, body, { transport: 'fetch' });
    expect(mockFetch.mock.calls[3][1]?.keepalive).toBe(true);
  });

  test('beacon returns when the browser accepts it', () => {
    const response = sendWeb(url, data, { transport: 'beacon' });
    expect(mockBeacon).toHaveBeenCalledWith(url, dataStringified);
    expect(response).toStrictEqual({});
  });

  test('a refused beacon throws beacon-rejected, retryable up to 64 KiB', () => {
    mockBeacon.mockReturnValue(false);
    expect(() => sendWeb(url, data, { transport: 'beacon' })).toThrow(
      expect.objectContaining({ code: 'beacon-rejected', retryable: true }),
    );
    expect(() =>
      sendWeb(url, 'x'.repeat(65 * 1024), { transport: 'beacon' }),
    ).toThrow(
      expect.objectContaining({ code: 'beacon-rejected', retryable: false }),
    );
    mockBeacon.mockReturnValue(true);
  });

  test('xhr', () => {
    const response = sendWeb(url, data, { transport: 'xhr' });
    expect(mockXHROpen).toHaveBeenCalledWith('POST', url, false);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
    expect(mockXHR.send).toHaveBeenCalledWith(dataStringified);
    expect(response).toStrictEqual({ data });
  });

  test('xhr with custom headers', () => {
    const headers = { 'Custom-Header': 'customValue' };
    sendWeb(url, data, { transport: 'xhr', headers });

    expect(mockXHRHeader).toHaveBeenCalledWith('Custom-Header', 'customValue');
  });

  test('xhr with method option', () => {
    sendWeb(url, data, { transport: 'xhr', method: 'PUT' });
    expect(mockXHROpen).toHaveBeenCalledWith('PUT', url, false);
  });

  test('a non-2xx xhr throws a StepError with status and body', () => {
    mockXHR.status = 500;
    expect(() => sendWeb(url, data, { transport: 'xhr' })).toThrow(
      expect.objectContaining({
        code: 'transport',
        status: 500,
        retryable: true,
        body: data,
      }),
    );
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

    test.each([0, -1, NaN])(
      'falls back to the default timeout for %p',
      (timeout) => {
        // The default is 10000 ms: nothing is aborted after 5000 ms.
        const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
        window.fetch = makeHangingFetch();
        sendWeb(url, data, { transport: 'fetch', timeout }).catch(
          () => undefined,
        );
        jest.advanceTimersByTime(5000);
        expect(abortSpy).not.toHaveBeenCalled();
        jest.advanceTimersByTime(5000);
      },
    );

    test('an explicit timeout rejects with code timeout', async () => {
      window.fetch = makeHangingFetch();
      const promise = sendWeb(url, data, { transport: 'fetch', timeout: 50 });
      jest.advanceTimersByTime(50);
      await expect(promise).rejects.toMatchObject({
        code: 'timeout',
        retryable: true,
      });
    });

    test('fetch passes an abort signal', async () => {
      await sendWeb(url, data, { transport: 'fetch' });

      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});

import { StepError } from '@walkeros/core';
import { sendServer } from '../sendServer';

describe('sendServer on the global fetch', () => {
  afterEach(() => jest.restoreAllMocks());

  it('throws a StepError with status, retryable and body for a 503 from a stubbed global fetch', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"error":"busy"}', { status: 503 }));
    const sent = sendServer('https://vendor.example/collect', {
      name: 'page view',
    });
    await expect(sent).rejects.toBeInstanceOf(StepError);
    await expect(sent).rejects.toMatchObject({
      code: 'transport',
      status: 503,
      retryable: true,
      body: { error: 'busy' },
    });
  });

  it('throws a non-retryable StepError for a 400, the body never in the message', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"invalid value user@example.com"}', {
        status: 400,
        statusText: 'Bad Request user@example.com',
      }),
    );
    const sent = sendServer('https://vendor.example/collect', {});
    await expect(sent).rejects.toMatchObject({
      code: 'transport',
      status: 400,
      retryable: false,
      message: 'HTTP 400',
    });
  });

  it('keeps the cause code of a network error in its message, never the address', async () => {
    const cause = Object.assign(
      new Error('connect ECONNREFUSED 127.0.0.1:9?key=secret'),
      { code: 'ECONNREFUSED' },
    );
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed', { cause }));
    await expect(
      sendServer('https://vendor.example/collect', {}),
    ).rejects.toMatchObject({
      code: 'transport',
      message: 'fetch failed (ECONNREFUSED)',
    });
  });

  it('throws code transport for a network error', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      sendServer('https://vendor.example/collect', {}),
    ).rejects.toMatchObject({ code: 'transport', retryable: true });
  });

  it('resolves with the parsed body on a 2xx', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"e1"}', { status: 200 }));
    await expect(
      sendServer('https://vendor.example/collect', { name: 'page view' }),
    ).resolves.toEqual({ data: { id: 'e1' } });
  });

  it('resolves with the text of a body that is not JSON', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('accepted', { status: 202 }));
    await expect(
      sendServer('https://vendor.example/collect', {}),
    ).resolves.toEqual({ data: 'accepted' });
  });

  it('times out a fetch that never settles, driven by fake timers', async () => {
    jest.useFakeTimers();
    jest
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(new Promise<Response>(() => undefined));
    const sent = sendServer(
      'https://vendor.example/collect',
      {},
      { timeout: 1000 },
    );
    jest.advanceTimersByTime(1000);
    await expect(sent).rejects.toMatchObject({
      code: 'timeout',
      retryable: true,
    });
    jest.useRealTimers();
  });

  it('reports an invalid URL as config, not retryable', async () => {
    await expect(sendServer('not a url', {})).rejects.toMatchObject({
      code: 'config',
      retryable: false,
    });
  });

  it('sends no body for GET', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 200 }));
    await sendServer(
      'https://vendor.example/collect',
      { a: 1 },
      {
        method: 'GET',
      },
    );
    expect(spy.mock.calls[0][1]?.body).toBeUndefined();
  });

  it('sends the JSON body with the method and headers on POST', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 200 }));
    await sendServer(
      'https://vendor.example/collect',
      { a: 1 },
      { headers: { 'X-Key': 'k' } },
    );
    expect(spy.mock.calls[0][0]).toBe('https://vendor.example/collect');
    expect(spy.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: '{"a":1}',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Key': 'k',
      },
    });
  });
});

import { createTracePoller } from '../../../runtime/trace-poller.js';
import { createMockLogger } from '../../helpers/mock-logger.js';
import { getTraceUntil, setTraceUntil } from '@walkeros/core';

type FetchInit = { method?: string; headers?: Record<string, string> };
type FetchFn = (url: string, init?: FetchInit) => Promise<TestResponse>;

interface TestResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

function okResponse(body: unknown): TestResponse {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

const mockLogger = createMockLogger();

const baseOptions = {
  url: 'https://observer.example.com/trace/dep_42',
  token: 'tok_test',
  intervalMs: 15_000,
};

describe('createTracePoller', () => {
  let fetchMock: jest.Mock<Promise<TestResponse>, [string, FetchInit?]>;
  let fetchFn: FetchFn;

  beforeEach(() => {
    setTraceUntil(null);
    jest.useFakeTimers();
    fetchMock = jest.fn();
    fetchFn = (url, init) => fetchMock(url, init);
  });

  afterEach(() => {
    jest.useRealTimers();
    setTraceUntil(null);
    jest.clearAllMocks();
  });

  it('polls immediately on start and writes traceUntil from a 200 response', async () => {
    const future = '2026-06-01T12:00:00.000Z';
    fetchMock.mockResolvedValue(okResponse({ traceUntil: future }));

    const poller = createTracePoller(
      { ...baseOptions, fetch: fetchFn },
      mockLogger,
    );
    await poller.pollOnce();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://observer.example.com/trace/dep_42',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok_test' }),
      }),
    );
    expect(getTraceUntil()).toBe(future);
    poller.stop();
  });

  it('clears traceUntil when the 200 response carries null', async () => {
    setTraceUntil('2026-06-01T00:00:00.000Z');
    fetchMock.mockResolvedValue(okResponse({ traceUntil: null }));

    const poller = createTracePoller(
      { ...baseOptions, fetch: fetchFn },
      mockLogger,
    );
    await poller.pollOnce();

    expect(getTraceUntil()).toBeNull();
    poller.stop();
  });

  it('leaves the holder unchanged on a network error', async () => {
    setTraceUntil('2026-06-01T00:00:00.000Z');
    fetchMock.mockRejectedValue(new Error('network down'));

    const poller = createTracePoller(
      { ...baseOptions, fetch: fetchFn },
      mockLogger,
    );
    await expect(poller.pollOnce()).resolves.toBeUndefined();

    expect(getTraceUntil()).toBe('2026-06-01T00:00:00.000Z');
    poller.stop();
  });

  it('leaves the holder unchanged on a non-200 response', async () => {
    setTraceUntil('2026-06-01T00:00:00.000Z');
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ traceUntil: null }),
    });

    const poller = createTracePoller(
      { ...baseOptions, fetch: fetchFn },
      mockLogger,
    );
    await poller.pollOnce();

    expect(getTraceUntil()).toBe('2026-06-01T00:00:00.000Z');
    poller.stop();
  });

  it('leaves the holder unchanged when the body cannot be parsed', async () => {
    setTraceUntil('2026-06-01T00:00:00.000Z');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('not json')),
    });

    const poller = createTracePoller(
      { ...baseOptions, fetch: fetchFn },
      mockLogger,
    );
    await poller.pollOnce();

    expect(getTraceUntil()).toBe('2026-06-01T00:00:00.000Z');
    poller.stop();
  });

  it('skips overlapping polls while one is in flight', async () => {
    let resolveFirst: (value: TestResponse) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<TestResponse>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const poller = createTracePoller(
      { ...baseOptions, fetch: fetchFn },
      mockLogger,
    );

    const first = poller.pollOnce();
    // Second call must short-circuit while the first request is unresolved.
    await poller.pollOnce();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFirst(okResponse({ traceUntil: '2026-06-01T12:00:00.000Z' }));
    await first;
    poller.stop();
  });

  it('start is idempotent and does not orphan the interval', () => {
    fetchMock.mockResolvedValue(okResponse({ traceUntil: null }));

    const poller = createTracePoller(
      { ...baseOptions, fetch: fetchFn },
      mockLogger,
    );
    poller.start();
    poller.start();
    const callsAfterStart = fetchMock.mock.calls.length;
    // A single immediate poll, not one per start().
    expect(callsAfterStart).toBe(1);

    poller.stop();
    jest.advanceTimersByTime(60_000);
    // stop() must fully clear the lone interval — no leaked timer keeps firing.
    expect(fetchMock.mock.calls.length).toBe(callsAfterStart);
  });

  it('stop clears the interval (no further polls)', () => {
    fetchMock.mockResolvedValue(okResponse({ traceUntil: null }));

    const poller = createTracePoller(
      { ...baseOptions, fetch: fetchFn },
      mockLogger,
    );
    poller.start();
    const callsAfterStart = fetchMock.mock.calls.length;
    poller.stop();

    jest.advanceTimersByTime(60_000);
    expect(fetchMock.mock.calls.length).toBe(callsAfterStart);
  });
});

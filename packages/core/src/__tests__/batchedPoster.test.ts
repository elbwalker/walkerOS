import { createBatchedPoster } from '..';
import type { FlowState, PosterFetch, PosterResponse } from '..';

const URL = 'https://observer.example.com/ingest/dep_42';
const TOKEN = 'tok_secret_value';

function makeState(eventId = 'span_abc'): FlowState {
  return {
    flowId: 'flow_x',
    stepId: 'collector.push',
    stepType: 'collector',
    phase: 'in',
    eventId,
    timestamp: new Date(0).toISOString(),
    elapsedMs: 0,
  };
}

interface CapturedCall {
  url: string;
  init: { method: string; headers: Record<string, string>; body: string };
}

interface FetchHarness {
  fetch: PosterFetch;
  calls: CapturedCall[];
  callCount: () => number;
}

function makeFetchHarness(
  responder: () => Promise<PosterResponse> | PosterResponse,
): FetchHarness {
  const calls: CapturedCall[] = [];
  const fetchImpl: PosterFetch = async (url, init) => {
    calls.push({ url, init });
    return responder();
  };
  return {
    fetch: fetchImpl,
    calls,
    callCount: () => calls.length,
  };
}

function ok(): PosterResponse {
  return { ok: true, status: 200 };
}

function fail(status: number): PosterResponse {
  return { ok: false, status };
}

function readBody(init: CapturedCall['init']): FlowState[] {
  return JSON.parse(init.body);
}

async function flushMicrotasks(): Promise<void> {
  // Drain enough ticks for: Promise.resolve -> then(fetch) -> await fetch
  // -> then(check)/catch(onError). 6 ticks is comfortably above any chain.
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
}

describe('createBatchedPoster', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('posts a single FlowState after batchMs elapses', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
    });

    emit(makeState('span_1'));
    expect(harness.callCount()).toBe(0);

    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(harness.callCount()).toBe(1);
    expect(harness.calls[0].init.method).toBe('POST');
    expect(readBody(harness.calls[0].init)).toEqual([makeState('span_1')]);
  });

  it('posts immediately when batch size hits the cap', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 3,
      fetch: harness.fetch,
    });

    emit(makeState('a'));
    emit(makeState('b'));
    expect(harness.callCount()).toBe(0);
    emit(makeState('c'));
    await flushMicrotasks();

    expect(harness.callCount()).toBe(1);
    const body = readBody(harness.calls[0].init);
    expect(body).toHaveLength(3);
    expect(body[0].eventId).toBe('a');
    expect(body[2].eventId).toBe('c');
  });

  it('drops batch on fetch error without throwing', async () => {
    const harness = makeFetchHarness(async () => {
      throw new Error('network down');
    });
    const errors: unknown[] = [];
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
      onError: (e) => errors.push(e),
    });

    expect(() => emit(makeState())).not.toThrow();

    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(harness.callCount()).toBe(1);
    expect(errors).toHaveLength(1);
    const err = errors[0];
    if (!(err instanceof Error)) throw new Error('Expected Error');
    expect(err.message).toBe('network down');
  });

  it('sets the Authorization Bearer header', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
    });

    emit(makeState());
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(harness.calls[0].init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('sends Content-Type application/json and a JSON array body', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
    });

    emit(makeState('one'));
    emit(makeState('two'));
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    const headers = harness.calls[0].init.headers;
    expect(headers['Content-Type']).toBe('application/json');
    const body = readBody(harness.calls[0].init);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });

  it('reports non-2xx responses via onError without throwing', async () => {
    const harness = makeFetchHarness(async () => fail(500));
    const errors: unknown[] = [];
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
      onError: (e) => errors.push(e),
    });

    emit(makeState());
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(errors).toHaveLength(1);
    const err = errors[0];
    if (!(err instanceof Error)) throw new Error('Expected Error');
    expect(err.message).toBe('Observer responded 500');
  });
});
